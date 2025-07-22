/*
How to use:

Call badgeify(selector) on the section/card parent selector(s) you wish to add required field badges to, e.g.:
badgeify('.card.border-info');

Data attributes:
data-badge-required="true" on <label> for any required field (individual or group).
data-badge-required-if="#isChecked,true" on <label> of the conditional required field
data-badge-group="groupname" on <label> for either-or required field groups (all fields in the group share the same group name).
data-badge-target="#selector" and data-badge-position="left|right" on any element within the section to control badge placement/side.

Example:
<div class="card border-info">
    <div class="card-header">
        <button id="myHeaderBtn" data-badge-target="#myHeaderBtn" data-badge-position="right">Section Header</button>
    </div>
    <div class="collapse">
        <label data-badge-required="true" for="Employee_Name">Name</label>
        <input id="Employee_Name" name="Employee.Name" />

        <label data-badge-required="true" data-badge-group="id-passport" for="Employee_Id">ID</label>
        <input id="Employee_Id" name="Employee.Id" />
        <label data-badge-required="true" data-badge-group="id-passport" for="Employee_Passport">Passport</label>
        <input id="Employee_Passport" name="Employee.Passport" />
    </div>
</div>

badgeify('.card.border-info');
*/

function badgeify(sectionSelectorOrElements) {
    var isSelector = typeof sectionSelectorOrElements === "string";
    var $sections = isSelector
        ? $(sectionSelectorOrElements)
        : $(sectionSelectorOrElements);

    function getOutermostSection(elem) {
        const $allSections = $(elem).parents(sectionSelectorOrElements);
        return $allSections.length ? $allSections.last() : $();
    }

    function isConditionallyRequired($label, $section) {
        var attr = $label.data('badge-required-if');
        if (!attr) return true; // Not conditional, treat as always required

        var [selector, values] = attr.split(',');
        var $other = $section.find(selector.trim());
        if (!$other.length) return false;

        //Split values and handle negation (!)
        var vals = values.split(',').map(v => v.trim());

        // checkbox: check .prop('checked'), otherwise .val()
        let fieldValue;
        if ($other.is(':checkbox')) {
            fieldValue = $other.prop('checked') ? "true" : "false";
        } else {
            fieldValue = ($other.val() || '').toLowerCase();
        }

        // Check each value condition
        for (let val of vals) {
            let isNegated = val.startsWith('!');
            let cmpValue = isNegated ? val.slice(1).toLowerCase() : val.toLowerCase();

            // For checkbox, match true/false
            if (isNegated) {
                if (fieldValue !== cmpValue) return true; // Required if NOT equal
            } else {
                if (fieldValue === cmpValue) return true; // Required if equal
            }
        }
    }

    if (isSelector) {
        $(document)
            .off('.badgeify')
            .on('input.badgeify change.badgeify', sectionSelectorOrElements + ' input, ' + sectionSelectorOrElements + ' select, ' + sectionSelectorOrElements + ' textarea', function () {
                const $section = getOutermostSection(this);
                if ($section.length) updateSectionBadge($section);
            })
            .on('change.badgeify', sectionSelectorOrElements + ' input[type=checkbox]', function () {
                const $section = getOutermostSection(this);
                if ($section.length) updateSectionBadge($section);
            })
            .on('reset.badgeify', sectionSelectorOrElements + ' form', function () {
                const $section = getOutermostSection(this);
                setTimeout(function () {
                    if ($section.length) updateSectionBadge($section);
                }, 0);
            })
            .on('changed.bs.select.badgeify', sectionSelectorOrElements + ' select.selectpicker', function () {
                const $section = getOutermostSection(this);
                if ($section.length) updateSectionBadge($section);
            });
    }

    $sections.each(function () {
        updateSectionBadge($(this));
    });

    function updateSectionBadge($section) {
        let $badgeTarget = $section.find('.card-header button').first();
        let badgePosition = $badgeTarget.data('badge-position') || 'right';

        const $customTarget = $section.find('[data-badge-target]');
        if ($customTarget.length) {
            const selector = $customTarget.data('badge-target');
            if (selector) {
                $badgeTarget = $section.find(selector);
            }
            if ($customTarget.data('badge-position')) {
                badgePosition = $customTarget.data('badge-position');
            }
        }

        const $soloLabels = $section.find('label[data-badge-required="true"]:not([data-badge-group])');
        const $conditionalLabels = $section.find('label[data-badge-required-if]:not([data-badge-group])');
        let missing = 0;
        let totalRequired = 0;

        $soloLabels.each(function () {
            const $label = $(this);
            if (!isConditionallyRequired($label, $section)) return;
            totalRequired++;
            const aspFor = $label.attr('for') || $label.attr('asp-for');
            let $input;
            if (aspFor) {
                $input = $section.find('#' + aspFor);
                if ($input.length === 0) $input = $section.find('[name="' + aspFor + '"]');
                if ($input.length === 0) $input = $section.find('[name$="' + aspFor + '"]');
            } else {
                $input = $label.closest('.d-flex').find('input, select, textarea').first();
            }
            let val;
            if ($input.is(':checkbox')) {
                val = $input.prop('checked') ? 'true' : '';
            } else {
                val = $input.val();
            }
            if (!val || val.trim() === '') missing++;
        });

        $conditionalLabels.each(function () {
            const $label = $(this);
            if (!isConditionallyRequired($label, $section)) return;
            totalRequired++;
            const aspFor = $label.attr('for') || $label.attr('asp-for');
            let $input;
            if (aspFor) {
                $input = $section.find('#' + aspFor);
                if ($input.length === 0) $input = $section.find('[name="' + aspFor + '"]');
                if ($input.length === 0) $input = $section.find('[name$="' + aspFor + '"]');
            } else {
                $input = $label.closest('.d-flex').find('input, select, textarea').first();
            }
            let val;
            if ($input.is(':checkbox')) {
                val = $input.prop('checked') ? 'true' : '';
            } else {
                val = $input.val();
            }
            if (!val || val.trim() === '') missing++;
        });

        const groupNames = [...new Set($section.find('label[data-badge-group]').map(function () { return $(this).attr('data-badge-group'); }).get())];
        groupNames.forEach(function (group) {
            const $groupLabels = $section.find('label[data-badge-group="' + group + '"]');
            if (!$groupLabels.is('[data-badge-required="true"],[data-badge-required-if]')) return;
            totalRequired++;
            let anyFilled = false;
            $groupLabels.each(function () {
                const $label = $(this);
                if ($label.is('[data-badge-required-if]') && !isConditionallyRequired($label, $section)) return;
                const aspFor = $label.attr('for') || $label.attr('asp-for');
                let $input;
                if (aspFor) {
                    $input = $section.find('#' + aspFor);
                    if ($input.length === 0) $input = $section.find('[name="' + aspFor + '"]');
                    if ($input.length === 0) $input = $section.find('[name$="' + aspFor + '"]');
                } else {
                    $input = $label.closest('.d-flex').find('input, select, textarea').first();
                }
                let val;
                if ($input.is(':checkbox')) {
                    val = $input.prop('checked') ? 'true' : '';
                } else {
                    val = $input.val();
                }
                if (val && val.trim() !== '') anyFilled = true;
            });
            if (!anyFilled) missing++;
        });

        let badge = '';
        if (totalRequired > 0) {
            if (missing > 0) {
                badge = `<span class="badge bg-danger ms-2 sectionFieldsBadge">${missing} Fields Left</span>`;
            } else {
                badge = `<span class="badge bg-success ms-2 sectionFieldsBadge">All Finished</span>`;
            }
        }
        $badgeTarget.find('.sectionFieldsBadge').remove();
        if (badgePosition === 'left') {
            $badgeTarget.prepend(badge);
        } else {
            $badgeTarget.append(badge);
        }
    }
}