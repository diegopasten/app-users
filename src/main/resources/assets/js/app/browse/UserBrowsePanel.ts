import {UserItemsTreeGrid} from './UserItemsTreeGrid';
import {UserBrowseToolbar} from './UserBrowseToolbar';
import {UserTreeGridItem, UserTreeGridItemType} from './UserTreeGridItem';
import {UserBrowseItemPanel} from './UserBrowseItemPanel';
import {UserTreeGridActions} from './UserTreeGridActions';
import {PrincipalBrowseFilterPanel} from './filter/PrincipalBrowseFilterPanel';
import {Router} from '../Router';
import {PrincipalServerEventsHandler} from '../event/PrincipalServerEventsHandler';
import {IdProvider} from '../principal/IdProvider';
import {TreeNode} from 'lib-admin-ui/ui/treegrid/TreeNode';
import {BrowseItem} from 'lib-admin-ui/app/browse/BrowseItem';
import {PrincipalType} from 'lib-admin-ui/security/PrincipalType';
import {Principal} from 'lib-admin-ui/security/Principal';
import {BrowsePanel} from 'lib-admin-ui/app/browse/BrowsePanel';
import {AppHelper} from 'lib-admin-ui/util/AppHelper';
import {i18n} from 'lib-admin-ui/util/Messages';

export class UserBrowsePanel
    extends BrowsePanel<UserTreeGridItem> {

    protected treeGrid: UserItemsTreeGrid;

    constructor() {
        super();

        this.bindServerEventListeners();

        const changeSelectionStatus = AppHelper.debounce((selection: TreeNode<UserTreeGridItem>[]) => {
            const singleSelection = selection.length === 1;
            const newAction = this.treeGrid.getTreeGridActions().NEW;

            let label;

            if (singleSelection && selection[0].getData().getType() !== UserTreeGridItemType.ID_PROVIDER) {
                const userItem = selection[0].getData();

                switch (userItem.getType()) {
                case UserTreeGridItemType.USERS:
                    label = i18n('action.new.user');
                    break;
                case UserTreeGridItemType.GROUPS:
                    label = i18n('action.new.group');
                    break;
                case UserTreeGridItemType.ROLES:
                    label = i18n('action.new.role');
                    break;
                case UserTreeGridItemType.PRINCIPAL:
                    label = i18n(`action.new.${PrincipalType[userItem.getPrincipal().getType()].toLowerCase()}`);
                    break;
                default:
                    label = i18n('action.new.more');
                }
            } else {
                label = i18n('action.new.more');
            }
            newAction.setLabel(label);
        }, 10);

        this.treeGrid.onSelectionChanged(() => changeSelectionStatus(this.treeGrid.getRoot().getCurrentSelection()));

        this.treeGrid.onHighlightingChanged((node: TreeNode<UserTreeGridItem>) => changeSelectionStatus(node ? [node] : []));

        this.onShown(() => {
            Router.setHash('browse');
        });
    }

    private bindServerEventListeners() {
        const serverHandler = PrincipalServerEventsHandler.getInstance();

        serverHandler.onUserItemCreated((principal: Principal, idProvider: IdProvider, sameTypeParent?: boolean) => {
            this.treeGrid.appendUserNode(principal, idProvider, sameTypeParent);
            this.setRefreshOfFilterRequired();

            /*
                In case you switch to UserBrowsePanel before this event occured you need to trigger refresh manually
                Otherwise 'shown' event won't update filter
             */
            if (this.isVisible()) {
                this.refreshFilter();
            }
        });

        serverHandler.onUserItemUpdated((principal: Principal, idProvider: IdProvider) => {
            this.treeGrid.updateUserNode(principal, idProvider);
        });

        serverHandler.onUserItemDeleted((ids: string[]) => {
            this.setRefreshOfFilterRequired();
            /*
             Deleting content won't trigger browsePanel.onShow event,
             because we are left on the same panel. We need to refresh manually.
             */

            ids.forEach(id => {
                const node = this.treeGrid.getRoot().getCurrentRoot().findNode(id);
                if (node) {
                    this.treeGrid.deleteNode(node.getData());
                }
            });

            this.refreshFilter();
        });
    }

    protected createToolbar(): UserBrowseToolbar {
        let browseActions = <UserTreeGridActions> this.treeGrid.getTreeGridActions();

        return new UserBrowseToolbar(browseActions);
    }

    protected createTreeGrid(): UserItemsTreeGrid {
        return new UserItemsTreeGrid();
    }

    protected createBrowseItemPanel(): UserBrowseItemPanel {
        return new UserBrowseItemPanel();
    }

    protected createFilterPanel(): PrincipalBrowseFilterPanel {
        return new PrincipalBrowseFilterPanel();
    }

    protected enableSelectionMode() {
        this.treeGrid.filter(this.treeGrid.getSelectedDataList());
    }

    treeNodeToBrowseItem(node: TreeNode<UserTreeGridItem>): BrowseItem<UserTreeGridItem> | null {
        const data = node ? node.getData() : null;
        return !data ? null : <BrowseItem<UserTreeGridItem>>new BrowseItem<UserTreeGridItem>(data)
            .setId(data.getDataId())
            .setDisplayName(data.getItemDisplayName())
            .setIconClass(this.selectIconClass(data));
    }

    treeNodesToBrowseItems(nodes: TreeNode<UserTreeGridItem>[]): BrowseItem<UserTreeGridItem>[] {
        let browseItems: BrowseItem<UserTreeGridItem>[] = [];

        // do not proceed duplicated content. still, it can be selected
        nodes.forEach((node: TreeNode<UserTreeGridItem>) => {
            const item = this.treeNodeToBrowseItem(node);
            if (item) {
                browseItems.push(item);
            }
        });
        return browseItems;
    }

    private selectIconClass(item: UserTreeGridItem): string {

        let type: UserTreeGridItemType = item.getType();

        switch (type) {
        case UserTreeGridItemType.ID_PROVIDER:
            return 'icon-address-book icon-large';

        case UserTreeGridItemType.PRINCIPAL:
            if (item.getPrincipal().isRole()) {
                return 'icon-masks icon-large';

            } else if (item.getPrincipal().isUser()) {
                return 'icon-user icon-large';

            } else if (item.getPrincipal().isGroup()) {
                return 'icon-users icon-large';
            }
            break;

        case UserTreeGridItemType.GROUPS:
            return 'icon-folder icon-large';

        case UserTreeGridItemType.ROLES:
            return 'icon-folder icon-large';

        case UserTreeGridItemType.USERS:
            return 'icon-folder icon-large';
        }

    }
}
