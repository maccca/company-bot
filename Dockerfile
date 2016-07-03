FROM node:latest

# Setup a directory for our app
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Add our run script to make it easier to run through ECS
ADD run_hubot.sh /usr/src/app/

# Add package.json and external-scripts.json so we can customize them at build time
ADD package.json /usr/src/app/
ADD external-scripts.json /usr/src/app/

# Fetch the packages required to generate our Hubot
RUN npm install
RUN npm install yo generator-hubot

# Bundle app source
COPY . /usr/src/app

EXPOSE 80 443
ENV HUBOT_SLACK_TOKEN xoxb-44200729191-UTPD7ZAqVkYVukgRZ10YXmk1
ENV HUBOT_ADAPTER slack
# Generate our Hubot -- configure this as needed
# CMD yo hubot --owner "Owner <rj@promisepay.com>" --name sirmcfaulian --adapter slack --defaults
CMD [ "./bin/hubot" ]
 #, "--adapter", "slack" ]
# CMD bin/hubot
