var Helper, co, expect, helper, scriptHelper;

Helper = require('hubot-test-helper');
helper = new Helper('./scripts/script.js');

co = require('co');
expect = require('chai').expect;

describe('hello-world', function() {

    beforeEach(function() {
        return this.room = helper.createRoom();
    });

    afterEach(function() {
        return this.room.destroy();
    });

    return context('user says hi to hubot', function() {
        beforeEach(function() {
            return co((function(_this) {
                return function*() {
                    (yield _this.room.user.say('alice', '@hubot hi'));
                    return (yield _this.room.user.say('bob', '@hubot hi'));
                };
            })(this));
        });

        return it('should reply to user', function() {
            return expect(this.room.messages).to.eql([
                ['alice', '@hubot hi'],
                ['hubot', '@alice hi'],
                ['bob', '@hubot hi'],
                ['hubot', '@bob hi']
            ]);
        });
    });

});
