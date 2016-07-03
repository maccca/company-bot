var dotenv = require('dotenv').config();

var username = process.env.ZENDESK_USERNAME;
var password = process.env.ZENDESK_PASSWORD;
var zendeskDomain = process.env.ZENDESK_DOMAIN;

var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

module.exports = function(robot) {
    robot.respond(/hi|hello|help/i, function(res) {
        var commands = [
            "Greetings! Let me help you!",
            "`checkin` - Check in with all the Specialists.",
            "`report` - Report all tickets for Specialists.",
            "`show` - Show agent's outstanding tickets (DM only)",
            "`checkin-urgent` - Check in with all the Specialists for urgent tickets.",
            "`report-urgent` - Report all urgent tickets for Specialists."
        ];

        res.reply(commands.join('\n'));
    });

    robot.respond(/report/i, function(res) {
        res.reply('Messaging a report of all ZenDesk tickets.');
        report(res, false, false);
    });

    robot.respond(/report-urgent/i, function(res) {
        res.reply('Messaging a report of all urgent ZenDesk tickets.');
        report(res, false, true);
    });

    robot.respond(/czechin|czech|checkin|check/i, function(res) {
        res.reply('Messaging a break-down of ZenDesk tickets to each of the Integration Support specialists.');
        report(res, true, false);
    });

    robot.respond(/czechin-urgent|checkin-urgent|check-urgent/i, function(res) {
        res.reply('Messaging a break-down of ZenDesk tickets to each of the Integration Support specialists.');
        report(res, true, true);
    });

    robot.respond(/show/i, function(res) {
        var user = getUserDetails(res.message.user.name);
        var isDM = res.message.room === res.message.user.name;

        if (user && isDM) {
            var url = 'https://' + zendeskDomain + '.zendesk.com/api/v2/search.json?query=type:ticket status:open tags:' + user.zendeskTag;

            robot.http(url).header('Authorization', auth).get()(function(err, response, body) {
                var jsonResponse = JSON.parse(body);
                var ticketCount = jsonResponse.count;
                var message = 'Hi ' + user.name + '! There are `' + ticketCount + '` developer support tickets waiting for <https://' + zendeskDomain + '.zendesk.com/agent/filters/' + user.zendeskView + '|you>. :hugging_face:\n';
                var count = 1;
                jsonResponse.results.forEach(function(ticket, index) {
                    var ticketUrl = 'https://ppay.zendesk.com/agent/tickets/' + ticket.id;
                    var ticketSubject = ticket.subject;
                    var ticketUpdatedAt = ticket.updated_at;

                    var now = new Date().getTime();
                    var ticketUpdateTime = new Date(ticketUpdatedAt).getTime();
                    var hoursAgo = Math.floor((now - ticketUpdateTime) / (60 * 60 * 1000));
                    message += count + ') <' + ticketUrl + '|' + ticketSubject + '> - :timer_clock: ' + hoursAgo + ' hrs\n';
                    count += 1;
                });

                messageUser(user.sID, message);
            });
        }
    });

    function getUserDetails(slackUsername) {
        var users = getUsers();

        for (var i = 0; i < users.length; i++) {
            var user = users[i];

            if (user.sID === slackUsername) {
                return user
            }
        }
    }

    function messageUser(user, message) {
        robot.adapter.customMessage({
            channel: user,
            attachments: [{
                title_link: 'Summary',
                fallback: message,
                text: message,
                mrkdwn_in: ['text']
            }]
        });
    }

    function messageSummary(res, summary, totalCount, totalHours, onlyUrgent) {
        var average = (totalHours / totalCount);

        if (isNaN(average)) average = 0;
        if (onlyUrgent) {
            var message = '\n :clipboard: *Summary* `' + totalCount + '` URGENT tickets `' + average + '` hrs average\n\n' + summary;
        } else {
            var message = '\n :clipboard: *Summary* `' + totalCount + '` tickets `' + average + '` hrs average\n\n' + summary;
        }
        res.reply(message);
    }

    function report(res, notifyUser, onlyUrgent) {
        var users = getUsers();
        var summary = '';
        var totalCount = 0;
        var syncedUsers = 0;
        var totalHours = 0;
        users.forEach(function(user) {
            if (onlyUrgent) {
                var url = 'https://' + zendeskDomain + '.zendesk.com/api/v2/search.json?query=type:ticket status:open priority:urgent tags:' + user.zendeskTag;
            } else {
                var url = 'https://' + zendeskDomain + '.zendesk.com/api/v2/search.json?query=type:ticket status:open tags:' + user.zendeskTag;
            }

            robot.http(url).header('Authorization', auth).get()(function(err, response, body) {
                syncedUsers += 1;
                var jsonResponse = JSON.parse(body);
                var ticketCount = jsonResponse.count;
                var message;
                totalCount += ticketCount;
                if (ticketCount > 0) {
                    if (onlyUrgent) {
                        message = 'Hi ' + user.name + '! There are `' + ticketCount + '` URGENT developer support tickets waiting for <https://' + zendeskDomain + '.zendesk.com/agent/filters/' + user.zendeskView + '|you>. :hugging_face:\n';
                    } else {
                        message = 'Hi ' + user.name + '! There are `' + ticketCount + '` developer support tickets waiting for <https://' + zendeskDomain + '.zendesk.com/agent/filters/' + user.zendeskView + '|you>. :hugging_face:\n';
                    }
                    var count = 1;
                    jsonResponse.results.forEach(function(ticket, index) {
                        var ticketUrl = 'https://ppay.zendesk.com/agent/tickets/' + ticket.id;
                        var ticketSubject = ticket.subject;
                        var ticketUpdatedAt = ticket.updated_at;

                        var now = new Date().getTime();
                        var ticketUpdateTime = new Date(ticketUpdatedAt).getTime();
                        var hoursAgo = Math.floor((now - ticketUpdateTime) / (60 * 60 * 1000));
                        totalHours += hoursAgo;
                        message += count + ') <' + ticketUrl + '|' + ticketSubject + '> - :timer_clock: ' + hoursAgo + ' hrs\n';
                        count += 1;
                    });
                    if (onlyUrgent) {
                        summary += '*' + user.name + '* - `' + ticketCount + '` outstanding URGENT tickets.\n';
                    } else {
                        summary += '*' + user.name + '* - `' + ticketCount + '` outstanding tickets.\n';
                    }
                } else {
                    if (onlyUrgent) {
                        summary += user.name + ' - `' + ticketCount + '` outstanding URGENT tickets.\n';
                    } else {
                        summary += user.name + ' - `' + ticketCount + '` outstanding tickets.\n';
                    }
                }
                if (notifyUser) {
                    messageUser(user.sID, message);
                }

                // done();
                if (syncedUsers == users.length) {
                    messageSummary(res, summary, totalCount, totalHours, onlyUrgent);
                }
            });
        });
    }

    function getUsers() {
        return [{
            name: process.env.USER1_NAME,
            zID: process.env.USER1_ZENDESK_ID,
            sID: process.env.USER1_SLACK_ID,
            zendeskView: process.env.USER1_ZENDESK_VIEW,
            zendeskTag: process.env.USER1_ZENDESK_TAG
        }, {
            name: process.env.USER2_NAME,
            zID: process.env.USER2_ZENDESK_ID,
            sID: process.env.USER2_SLACK_ID,
            zendeskView: process.env.USER2_ZENDESK_VIEW,
            zendeskTag: process.env.USER2_ZENDESK_TAG
        }, {
            name: process.env.USER3_NAME,
            zID: process.env.USER3_ZENDESK_ID,
            sID: process.env.USER3_SLACK_ID,
            zendeskView: process.env.USER3_ZENDESK_VIEW,
            zendeskTag: process.env.USER3_ZENDESK_TAG
        }, {
            name: process.env.USER4_NAME,
            zID: process.env.USER4_ZENDESK_ID,
            sID: process.env.USER4_SLACK_ID,
            zendeskView: process.env.USER4_ZENDESK_VIEW,
            zendeskTag: process.env.USER4_ZENDESK_TAG
        }, {
            name: process.env.USER5_NAME,
            zID: process.env.USER5_ZENDESK_ID,
            sID: process.env.USER5_SLACK_ID,
            zendeskView: process.env.USER5_ZENDESK_VIEW,
            zendeskTag: process.env.USER5_ZENDESK_TAG
        }, {
            name: process.env.USER6_NAME,
            zID: process.env.USER6_ZENDESK_ID,
            sID: process.env.USER6_SLACK_ID,
            zendeskView: process.env.USER6_ZENDESK_VIEW,
            zendeskTag: process.env.USER6_ZENDESK_TAG
        }];
    });
}
}
