/*
Still in development

How to use:

Call the function sortableTable() on the table you wish to sort by using the id, ie: sortableTable('#table')

Data variables:
data-type - Indication if the sort is numeric or string.
data-secondary-column - The index column number of the columns that should be sorted along with the sorted column, starting from 0.
data-initial-sort - Indicates that the column should be sorted on page load and in what order.

Example:
<table id="table">
    <thead>
        <tr>
            <th data-type="string" data-secondary-columns="1" data-initial-sort="asc">Name</th>
            <th data-type="numeric">Price</th>
        </tr>
    </thead>
    <tbody>
        ...
    </tbody>
</table>

*/

function sortableTable(selector) {
    var sortOrder = {};

    function sortTable(table, column, order, type) {
        var rows = table.find('tbody tr').get();
        rows.sort(function (a, b) {
            var keyA = $(a).children('td').eq(column).text().toUpperCase();
            var keyB = $(b).children('td').eq(column).text().toUpperCase();

            if (type === 'numeric') {
                keyA = parseFloat(keyA.replace(/[^\d.-]/g, ''));
                keyB = parseFloat(keyB.replace(/[^\d.-]/g, ''));
            }

            if (keyA < keyB) return order === 'asc' ? -1 : 1;
            if (keyA > keyB) return order === 'asc' ? 1 : -1;
            return 0;
        });

        $.each(rows, function (index, row) {
            table.children('tbody').append(row);
        });
    }

    function applySortIcon(table, th, order) {
        table.find('th .bi-caret-down-fill').remove();
        table.find('th .bi-caret-up-fill').remove();

        var icon = order === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
        th.append(` <i class="bi ${icon}"></i>`);
    }

    var table = $(selector);

    table.find('th').css('cursor', 'pointer').click(function () {
        var index = $(this).index();
        var type = $(this).data('type') || 'string';
        var secondaryColumns = $(this).data('secondary-columns') ? $(this).data('secondary-columns').toString().split(',') : [];

        sortOrder[index] = sortOrder[index] === 'asc' ? 'desc' : 'asc';

        applySortIcon(table, $(this), sortOrder[index]);

        sortTable(table, index, sortOrder[index], type);

        if (secondaryColumns.length > 0) {
            var groupedRows = {};
            table.find('tbody tr').each(function () {
                var key = $(this).children('td').eq(index).text().toUpperCase();
                if (!groupedRows[key]) {
                    groupedRows[key] = [];
                }
                groupedRows[key].push($(this));
            });

            var sortedKeys = Object.keys(groupedRows).sort(function (a, b) {
                if (a < b) return sortOrder[index] === 'asc' ? -1 : 1;
                if (a > b) return sortOrder[index] === 'asc' ? 1 : -1;
                return 0;
            });

            var newRows = [];
            $.each(sortedKeys, function (i, key) {
                var rows = groupedRows[key];
                $.each(secondaryColumns, function (j, secIndex) {
                    rows.sort(function (a, b) {
                        var secKeyA = $(a).children('td').eq(secIndex).text().toUpperCase();
                        var secKeyB = $(b).children('td').eq(secIndex).text().toUpperCase();
                        return secKeyA.localeCompare(secKeyB, undefined, { numeric: true });
                    });
                });
                newRows = newRows.concat(rows);
            });

            $.each(newRows, function (index, row) {
                table.children('tbody').append(row);
            });
        }
    });

    table.find('th[data-initial-sort]').each(function () {
        var index = $(this).index();
        var type = $(this).data('type') || 'string';
        var order = $(this).data('initial-sort');

        sortOrder[index] = order;

        applySortIcon(table, $(this), order);

        sortTable(table, index, order, type);
    });

    return table;
}