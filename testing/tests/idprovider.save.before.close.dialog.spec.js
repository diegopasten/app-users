/**
 * Created on 16.03.2018.
 */
const chai = require('chai');
const assert = chai.assert;
const webDriverHelper = require('../libs/WebDriverHelper');
const IdProviderWizard = require('../page_objects/wizardpanel/idprovider.wizard');
const UserBrowsePanel = require('../page_objects/browsepanel/userbrowse.panel');
const testUtils = require('../libs/test.utils');
const userItemsBuilder = require('../libs/userItems.builder.js');
const appConst = require('../libs/app_const');
const ConfirmationDialog = require('../page_objects/confirmation.dialog');

describe("Id Provider - checks unsaved changes", function () {
    this.timeout(appConst.TIMEOUT_SUITE);
    webDriverHelper.setupBrowser();

    //Id Provider wizard - Confirmation about unsaved changes when no changes were made #689
    it("GIVEN wizard for new Id Provider is opened WHEN no changes in the wizard AND 'close' icon pressed THEN Confirmation dialog must not be loaded",
        async () => {
            let userBrowsePanel = new UserBrowsePanel();
            let confirmationDialog = new ConfirmationDialog();
            await testUtils.openIdProviderWizard();
            await userBrowsePanel.doClickOnCloseTabButton("<Unnamed Id Provider>");
            await userBrowsePanel.pause(500);
            testUtils.saveScreenshot("provider_save_before1");
            let result = await confirmationDialog.isDialogLoaded();
            //there are no unsaved changes, so dialog should not be present.
            assert.isFalse(result, "Confirmation dialog must not be loaded");
        });

    it("GIVEN `IdProvider` wizard is opened WHEN description has been typed AND `close` icon pressed THEN Confirmation dialog should appear",
        async () => {
            let idProviderWizard = new IdProviderWizard();
            let userBrowsePanel = new UserBrowsePanel();
            let confirmationDialog = new ConfirmationDialog();
            await testUtils.openIdProviderWizard();
            await idProviderWizard.typeDescription('description');
            await userBrowsePanel.doClickOnCloseTabButton("<Unnamed Id Provider>");
            testUtils.saveScreenshot("provider_save_before2");
            //description has been typed, so save before close dialog should appear!
            await confirmationDialog.waitForDialogLoaded();
        });

    it("GIVEN Id Provider wizard is opened AND name and idProvider have been typed WHEN 'close' icon has been pressed THEN 'Confirmation' dialog should appear",
        async () => {
            let idProviderWizard = new IdProviderWizard();
            let name = userItemsBuilder.generateRandomName('provider');
            let userBrowsePanel = new UserBrowsePanel();
            let testStore = userItemsBuilder.buildIdProvider(name, 'test Id provider', 'First Selenium App', null);
            await testUtils.openIdProviderWizard(testStore);
            await idProviderWizard.typeData(testStore);

            testUtils.saveScreenshot("application_should_be_selected");
            await userBrowsePanel.doClickOnCloseTabButton(testStore.displayName);
            let confirmationDialog = new ConfirmationDialog();
            //'Confirmation' dialog should appear, otherwise exception will be thrown:
            await confirmationDialog.waitForDialogLoaded();
        });

    beforeEach(() => testUtils.navigateToUsersApp());
    afterEach(() => testUtils.doCloseUsersApp());
    before(() => {
        return console.log('specification starting: ' + this.title);
    });
});

