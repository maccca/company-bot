FROM ubuntu

RUN apt-get update
RUN apt-get -y install curl
# Grab the current latest version of Node.js and copy to /usr
RUN curl -LO https://nodejs.org/dist/v4.1.2/node-v4.1.2-linux-x64.tar.gz && tar zxvf node-v4.1.2-linux-x64.tar.gz && /bin/bash -c "cp -a node-v4.1.2-linux-x64/{bin,include,lib,share} /usr" && rm node-v4.1.2-linux-x64.tar.gz

# Add a user to run Hubot
RUN useradd -ms /bin/bash hubot

# Fetch the packages required to generate our Hubot
RUN npm -g install yo generator-hubot

# Switch to the user we created
USER hubot
RUN cd /home/hubot && mkdir hubot
WORKDIR /home/hubot/hubot

# Generate our Hubot -- configure this as needed
RUN yo hubot --owner "Owner <rj@promisepay.com>" --name sirmcfaulian --adapter slack --defaults

# Add our run script to make it easier to run through ECS
ADD run_hubot.sh /home/hubot/hubot/run_hubot.sh

# Add package.json and external-scripts.json so we can customize them at build time
ADD package.json /home/hubot/hubot/package.json
ADD external-scripts.json /home/hubot/hubot/external-scripts.json
RUN npm install
