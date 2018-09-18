/**
 * Created on 13.09.2018.
 */
const chai = require('chai');
chai.use(require('chai-as-promised'));
const assert = chai.assert;
const expect = chai.expect;
const webDriverHelper = require('../libs/WebDriverHelper');
const testUtils = require('../libs/test.utils');
const appConst = require('../libs/app_const');
const userStatisticsPanel = require('../page_objects/browsepanel/user.statistics.panel');

describe('`permissions.report.spec`: Generate Report data specification ', function () {
    this.timeout(appConst.TIMEOUT_SUITE);
    webDriverHelper.setupBrowser();

    it('GIVEN `Super User` is selected WHEN repository is not selected on the statistic panel THEN `Generate Report` button should be disabled',
        () => {
            return testUtils.findAndSelectItem('su').then(() => {
            }).then(() => {
                testUtils.saveScreenshot('generate_report_button_is_disabled');
                return userStatisticsPanel.waitForGenerateButtonDisabled();
            }).then(result => {
                assert.isTrue(result, '`Generate Report` button should be disabled');
            });
        });

    it('GIVEN `Super User` is selected WHEN repository has been selected on the statistic panel THEN `Generate Report` button is getting enabled',
        () => {
            return testUtils.findAndSelectItem('su').then(() => {
                return userStatisticsPanel.selectRepository('cms-repo');
            }).then(() => {
                testUtils.saveScreenshot('generate_report_button_is_enabled');
                return userStatisticsPanel.waitForGenerateButtonEnabled();
            }).then(result => {
                assert.isTrue(result, '`Generate Report` button should be enabled now');
            });
        });

    it('GIVEN `Super User` is selected WHEN `Generate Report` button has been pressed THEN new report should be created',
        () => {
            return testUtils.findAndSelectItem('su').then(() => {
                return userStatisticsPanel.selectRepository('cms-repo');
            }).then(() => {
                testUtils.saveScreenshot('generate_report_button_is_enabled');
                return userStatisticsPanel.waitForGenerateButtonEnabled();
            }).then(() => {
                return userStatisticsPanel.clickOnGenerateReportButton();
            }).then(() => {
                return userStatisticsPanel.waitForNotificationMessage();
            }).then(message => {
                assert.strictEqual(message, appConst.permissionsReportMessage('Super User'), `Correct notification message should appear`);
            }).then(() => {
                return userStatisticsPanel.getReportTitles();
            }).then(result => {
                assert.isTrue(result.length == 1, 'One report should be present on the page');
                assert.isTrue(result[0] === 'cms-repo', 'expected title of the report should be displayed');
            })


        });
    beforeEach(() => testUtils.navigateToUsersApp());
    afterEach(() => testUtils.doCloseUsersApp());
    before(() => {
        return console.log('specification starting: ' + this.title);
    });
});
