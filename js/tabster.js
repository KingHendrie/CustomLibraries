/*
How to use:

Encapsulate your card(s) inside a parent <div> with data-tab="groupname" (and optionally data-deletable="true").
The <ul class="nav nav-tabs"> and <div class="tab-content"> must have IDs.

The first .tab-pane will be cloned for new tabs.
Each .nav-link and .tab-pane must have unique IDs.

Add a .addTabBtn button inside the parent for cloning.
Optionally, add data-initfunction="yourFunction" to the button to run custom code after cloning.

Data Variables:
data-tab - Indicates the tab parent name, if more than one card is present, this will distinguish between them.
data-deletable - Indicates if the tab is deletable, this is an optional attribute.
data-initfunction - Added to the clone button to indicate a function that should be executed with the cloned tab. Make sure that the passed variable for the function is 'clonedContent'

Example:
<div data-tab="example" data-deletable="true">
    <ul class="nav nav-tabs" id="exampleTabs" role="tablist">
        <li class="nav-item">
            <a class="nav-link active" id="example-tab-1" data-bs-toggle="tab" href="#example-1" role="tab" aria-controls="example-1" aria-selected="true">Example 1</a>
        </li>
    </ul>
    <div class="tab-content" id="exampleTabsContent">
        <div class="tab-pane fade show active" id="example-1" role="tabpanel" aria-labelledby="example-tab-1">
            <div class="card">
                <div class="card-body">
                    <h4>Example Tab</h4>
                </div>
            </div>
        </div>
    </div>
    <button type="button" class="addTabBtn" data-initfunction="example">Add Another Tab</button>
</div>
*/

(function ($) {
    const defaults = {
        tabAttribute: 'data-tab',
        deletableAttribute: 'data-deletable',
        initFunctionAttribute: 'data-initfunction',
        navTabsSelector: '.nav-tabs',
        tabContentSelector: '.tab-content',
        navLinkSelector: '.nav-link',
        addTabBtnSelector: '.addTabBtn',
        deleteIconClass: 'bi bi-x-lg delete-icon',
        selectpickerClass: 'selectpicker',
        events: {
            cloned: 'tabster:cloned',
            deleted: 'tabster:deleted'
        }
    };

    $.tabster = {
        tabCounts: {},

        init: function (containerSelector, userOptions) {
            const options = $.extend(true, {}, defaults, userOptions || {});
            const $containers = containerSelector ? $(containerSelector) : $('[' + options.tabAttribute + ']');
            $containers.each(function () {
                const $container = $(this);
                const tabType = $container.attr(options.tabAttribute);
                if (!tabType) {
                    console.warn('[tabster] No tab type found on container:', $container);
                    return;
                }
                $.tabster._setupCounts($container, tabType, options);
                $.tabster._setupAddBtn($container, tabType, options);
                $.tabster._setupDeleteIcons($container, tabType, options);
            });
        },

        _setupCounts: function ($container, tabType, options) {
            const count = $container.find(options.navTabsSelector + ' .nav-item').length || 1;
            $.tabster.tabCounts[tabType] = count;
        },

        _setupAddBtn: function ($container, tabType, options) {
            $container.off('click.tabster').on('click.tabster', options.addTabBtnSelector, function (e) {
                e.preventDefault();
                try {
                    $.tabster.addTab($container, tabType, options);
                } catch (err) {
                    console.error(`[tabster] Error adding tab in group "${tabType}":`, err);
                }
            });
        },

        _setupDeleteIcons: function ($container, tabType, options) {
            const deletable = $container.attr(options.deletableAttribute) === "true";
            const $tabLinks = $container.find(options.navTabsSelector + ' ' + options.navLinkSelector);
            $tabLinks.each(function (index) {
                if (deletable && index > 0 && $(this).find('.delete-icon').length === 0) {
                    $.tabster._appendDeleteIcon($(this), tabType, options);
                }
            });

            $container.off('click.tabsterDelete').on('click.tabsterDelete', '.delete-icon', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const $navLink = $(this).closest(options.navLinkSelector);
                $.tabster.deleteTab($navLink, options);
            });
        },

        _appendDeleteIcon: function ($navLink, tabType, options) {
            const $icon = $('<i>')
                .attr('class', options.deleteIconClass)
                .css({ 'color': 'red', 'display': 'none', 'margin-left': '8px', 'cursor': 'pointer' })
                .attr('title', 'Delete this tab');
            $navLink.append($icon);
            $navLink.hover(
                function () { $icon.show(); },
                function () { $icon.hide(); }
            );
        },

        addTab: function ($container, tabType, options) {
            const tabList = $container.find(options.navTabsSelector);
            const tabContent = $container.find(options.tabContentSelector);
            const deletable = $container.attr(options.deletableAttribute) === "true";
            const $addBtn = $container.find(options.addTabBtnSelector).first();
            const initFunction = $addBtn.data('initfunction');
            let count = ++$.tabster.tabCounts[tabType];

            const newTabId = tabType + '-' + count;
            const newTabLinkId = tabType + '-tab-' + count;

            const $newTabLink = $('<a>')
                .addClass('nav-link')
                .attr({
                    id: newTabLinkId,
                    'data-bs-toggle': 'tab',
                    href: '#' + newTabId,
                    role: 'tab',
                    'aria-controls': newTabId,
                    'aria-selected': 'false'
                })
                .text(tabType.charAt(0).toUpperCase() + tabType.slice(1) + ' ' + count);

            if (deletable && count > 1) {
                $.tabster._appendDeleteIcon($newTabLink, tabType, options);
            }

            const $navItem = $('<li>').addClass('nav-item').append($newTabLink);
            tabList.append($navItem);

            const $firstPane = tabContent.find('.tab-pane').first();
            if ($firstPane.length === 0) throw new Error('No .tab-pane to clone in tab group: ' + tabType);
            const $clonedContent = $firstPane.children().clone(true, true);

            $.tabster._updateIndices($clonedContent, count - 1);

            $clonedContent.find('input[type="text"], input[type="number"], textarea').val('');
            $clonedContent.find('input[type="checkbox"]').prop('checked', false);

            $clonedContent.find('.dropdown.bootstrap-select').each(function () {
                var $dropdown = $(this);
                var $select = $dropdown.find('select.' + options.selectpickerClass);
                $dropdown.after($select);
                $dropdown.remove();
            });

            $clonedContent.find('select.' + options.selectpickerClass).each(function (idx) {
                var $clonedSelect = $(this);
                var $originalSelect = $firstPane.find('select.' + options.selectpickerClass).eq(idx).clone();
                $.tabster._updateIndices($originalSelect, count - 1);
                $clonedSelect.replaceWith($originalSelect);
                $originalSelect.val($originalSelect.find('option').first().val());
                $originalSelect.selectpicker();
            });

            if (initFunction && typeof window[initFunction] === 'function') {
                try { window[initFunction]($clonedContent); }
                catch (err) { console.error(`[tabster] Error in initFunction "${initFunction}":`, err); }
            }

            const $newTabPane = $('<div>')
                .addClass('tab-pane fade')
                .attr({
                    id: newTabId,
                    role: 'tabpanel',
                    'aria-labelledby': newTabLinkId
                })
                .append($clonedContent);

            tabContent.append($newTabPane);

            const tab = new bootstrap.Tab($newTabLink[0]);
            tab.show();

            $container.trigger(options.events.cloned, {
                tabType: tabType,
                navLink: $newTabLink,
                tabPane: $newTabPane,
                clonedContent: $clonedContent,
                count: count
            });

            $.tabster._setupDeleteIcons($container, tabType, options);
        },

        deleteTab: function ($navLink, options) {
            const href = $navLink.attr('href');
            const $tabPane = $(href);
            const $container = $navLink.closest('[' + defaults.tabAttribute + ']');
            const tabType = $container.attr(defaults.tabAttribute);

            $navLink.closest('li').remove();
            $tabPane.remove();

            if ($container.find('.nav-link.active').length === 0) {
                const $firstTab = $container.find('.nav-link').first();
                if ($firstTab.length) {
                    const tab = new bootstrap.Tab($firstTab[0]);
                    tab.show();
                }
            }
            $container.trigger(options.events.deleted, {
                tabType: tabType,
                navLink: $navLink,
                tabPane: $tabPane
            });
        },

        _updateIndices: function ($el, index) {
            ['id', 'name', 'data-valmsg-for', 'asp-for', 'for'].forEach(function (attr) {
                $el.filter('[' + attr + ']').each(function () {
                    var val = $(this).attr(attr);
                    if (/\d+/.test(val)) {
                        var newVal = val.replace(/\d+/, index);
                        $(this).attr(attr, newVal);
                    }
                });
            });
            $el.find('[id]').each(function () {
                var oldId = $(this).attr('id');
                if (/\d+/.test(oldId)) {
                    var newId = oldId.replace(/\d+/, index);
                    $(this).attr('id', newId);
                }
            });
            $el.find('[name]').each(function () {
                var oldName = $(this).attr('name');
                if (/\d+/.test(oldName)) {
                    var newName = oldName.replace(/\d+/, index);
                    $(this).attr('name', newName);
                }
            });
            $el.find('[data-valmsg-for]').each(function () {
                var oldValmsgFor = $(this).attr('data-valmsg-for');
                if (/\d+/.test(oldValmsgFor)) {
                    var newValmsgFor = oldValmsgFor.replace(/\d+/, index);
                    $(this).attr('data-valmsg-for', newValmsgFor);
                }
            });
            $el.find('[asp-for]').each(function () {
                var oldAspFor = $(this).attr('asp-for');
                if (/\d+/.test(oldAspFor)) {
                    var newAspFor = oldAspFor.replace(/\d+/, index);
                    $(this).attr('asp-for', newAspFor);
                }
            });
            $el.find('[for]').each(function () {
                var oldFor = $(this).attr('for');
                if (/\d+/.test(oldFor)) {
                    var newFor = oldFor.replace(/\d+/, index);
                    $(this).attr('for', newFor);
                }
            });
        }
    };

    $(function () {
        $.tabster.init();
    });

})(jQuery);