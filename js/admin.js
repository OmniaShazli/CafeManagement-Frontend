const ORDER_STATUSES = [
    'Pending',
    'Preparing',
    'Ready',
    'Completed',
    'Cancelled'
];

const RESERVATION_STATUSES = [
    'Confirmed',
    'Completed',
    'Cancelled'
];

const state = {
    categories: [],
    items: [],
    tables: [],
    reservations: [],
    orders: [],
    payments: [],
};
document.addEventListener('DOMContentLoaded', () => {

    const user = requireAuth('Admin');

    if (!user) return;

    const adminName = $('#admin-name');

    if (adminName) {

        adminName.textContent =
            (user.fullName || 'Admin').split(' ')[0];
    }

    bindTabs();
    bindDrawers();
    bindActions();

    loadAll();
});
async function loadAll() {

    await Promise.all([
        loadCategories(),
        loadItems(),
        loadTables(),
        loadReservations(),
        loadOrders(),
        loadPayments(),
    ]);

    renderOverview();
}
async function loadCategories() {

    try {

        state.categories =
            (await CategoryAPI.list()) || [];

    } catch (error) {

        state.categories = [];

        showToast(
            error?.message || 'Could not load categories.',
            'error'
        );
    }

    renderCategories();
    fillCategorySelect();
}

async function loadItems() {

    try {

        state.items =
            (await MenuItemAPI.list()) || [];

    } catch (error) {

        state.items = [];

        showToast(
            error?.message || 'Could not load menu items.',
            'error'
        );
    }

    renderItems();
}
async function loadTables() {

    try {

        state.tables =
            (await TableAPI.list()) || [];

    } catch (error) {

        state.tables = [];

        showToast(
            error?.message || 'Could not load tables.',
            'error'
        );
    }

    renderTablesAdmin();
}

async function loadReservations() {

    try {

        state.reservations =
            (await ReservationAPI.list()) || [];

    } catch (error) {

        state.reservations = [];

        showToast(
            error?.message || 'Could not load reservations.',
            'error'
        );
    }

    renderReservations();
}

async function loadOrders() {

    try {

        const response =
            await OrderAPI.list();

        console.log('====================================');
        console.log(
            'ADMIN ORDERS API RESPONSE:',
            response
        );
        console.log(
            'ADMIN ORDERS RESPONSE TYPE:',
            typeof response
        );
        console.log(
            'ADMIN ORDERS IS ARRAY:',
            Array.isArray(response)
        );
        console.log('====================================');


        const orders =
            extractOrdersFromResponse(response);


        console.log(
            'ADMIN ORDERS EXTRACTED:',
            orders
        );


        state.orders =
            orders.map(normalizeOrder);


        console.log(
            'ADMIN NORMALIZED ORDERS:',
            state.orders
        );


        const dineInOrders =
            state.orders.filter(
                order =>
                    getOrderType(order) === 'DineIn'
            );


        const takeAwayOrders =
            state.orders.filter(
                order =>
                    getOrderType(order) === 'TakeAway'
            );


        console.log(
            'ADMIN DINE-IN ORDERS:',
            dineInOrders
        );


        console.log(
            'ADMIN TAKEAWAY ORDERS:',
            takeAwayOrders
        );

        if (
            orders.length > 0 &&
            dineInOrders.length === 0
        ) {

            const hasAnyTableOrder =
                orders.some(
                    order =>
                        getOrderTableId(order) !== null
                );


            if (hasAnyTableOrder) {

                console.warn(
                    'Orders contain table information but no DineIn order was detected. Check orderType serialization.'
                );

            } else {

                console.warn(
                    'No DineIn orders were returned by the Orders API response. The frontend is not filtering them.'
                );
            }
        }

    } catch (error) {

        console.error(
            'ADMIN LOAD ORDERS ERROR:',
            error
        );

        state.orders = [];

        showToast(
            error?.message ||
            'Could not load orders.',
            'error'
        );
    }

    renderOrdersAdmin();

    renderOverview();
}

function extractOrdersFromResponse(response) {


    if (Array.isArray(response)) {

        return response;
    }

    if (
        Array.isArray(response?.items)
    ) {

        return response.items;
    }


    if (
        Array.isArray(response?.data)
    ) {

        return response.data;
    }

    if (
        Array.isArray(response?.orders)
    ) {

        return response.orders;
    }

    if (
        Array.isArray(response?.data?.items)
    ) {

        return response.data.items;
    }

    if (
        Array.isArray(response?.result)
    ) {

        return response.result;
    }

    if (
        Array.isArray(response?.$values)
    ) {

        return response.$values;
    }

    if (
        Array.isArray(response?.data?.$values)
    ) {

        return response.data.$values;
    }


    console.error(
        'Unexpected Orders API response:',
        response
    );

    return [];
}
function normalizeOrder(order) {

    if (
        !order ||
        typeof order !== 'object'
    ) {

        return {};
    }


    const normalized = {

        ...order,

        id:
            order.id ??
            order.orderId ??
            null,

        orderDate:
            order.orderDate ??
            order.createdAt ??
            order.creationDate ??
            null,

        totalPrice:
            order.totalPrice ??
            order.totalAmount ??
            order.amount ??
            0,

        status:
            order.status ??
            'Pending',

        tableId:
            getOrderTableId(order),

        items:
            getOrderItems(order)
    };

    normalized.orderType =
        normalizeOrderTypeValue(
            normalized
        );


    return normalized;
}

async function loadPayments() {

    try {

        state.payments =
            (await PaymentAPI.list()) || [];

    } catch (error) {

        state.payments = [];

        showToast(
            error?.message || 'Could not load payments.',
            'error'
        );
    }

    renderPayments();
}
function bindTabs() {

    $$('#admin-tabs .tab-btn')
        .forEach((btn) => {

            btn.addEventListener(
                'click',
                () => {

                    $$('#admin-tabs .tab-btn')
                        .forEach((b) =>
                            b.classList.toggle(
                                'is-active',
                                b === btn
                            )
                        );

                    $$('.tab-panel')
                        .forEach((panel) =>
                            panel.classList.toggle(
                                'is-active',
                                panel.id ===
                                `tab-${btn.dataset.tab}`
                            )
                        );
                }
            );
        });


    const refreshButton =
        $('#admin-refresh');


    if (refreshButton) {

        refreshButton.addEventListener(
            'click',
            async () => {

                await loadAll();

                showToast(
                    'Everything is up to date.'
                );
            }
        );
    }
}

function bindActions() {

    const itemAdd = $('#item-add');
    const itemSave = $('#item-save');

    const categoryAdd = $('#category-add');
    const categorySave = $('#category-save');

    const tableAdd = $('#table-add');
    const tableSave = $('#table-save');

    const paymentAdd = $('#payment-add');
    const paymentSave = $('#payment-save');


    if (itemAdd) {

        itemAdd.addEventListener(
            'click',
            () => openItemDrawer(null)
        );
    }


    if (itemSave) {

        itemSave.addEventListener(
            'click',
            saveItem
        );
    }


    if (categoryAdd) {

        categoryAdd.addEventListener(
            'click',
            () => openCategoryDrawer(null)
        );
    }


    if (categorySave) {

        categorySave.addEventListener(
            'click',
            saveCategory
        );
    }


    if (tableAdd) {

        tableAdd.addEventListener(
            'click',
            () => openTableDrawer(null)
        );
    }


    if (tableSave) {

        tableSave.addEventListener(
            'click',
            saveTable
        );
    }


    if (paymentAdd) {

        paymentAdd.addEventListener(
            'click',
            () =>
                openPanel(
                    $('#payment-drawer')
                )
        );
    }


    if (paymentSave) {

        paymentSave.addEventListener(
            'click',
            savePayment
        );
    }
}

function bindDrawers() {

    const overlay =
        $('#drawer-overlay');


    if (overlay) {

        overlay.addEventListener(
            'click',
            closePanels
        );
    }


    $$('[data-close-drawer]')
        .forEach((btn) =>
            btn.addEventListener(
                'click',
                closePanels
            )
        );
}


function openPanel(drawer) {

    if (!drawer) return;


    const overlay =
        $('#drawer-overlay');


    if (!overlay) return;


    overlay.classList.remove('hidden');

    drawer.classList.remove('hidden');

    void overlay.offsetWidth;

    overlay.classList.add('is-open');

    drawer.classList.add('is-open');
}


function closePanels() {

    const overlay =
        $('#drawer-overlay');


    if (overlay) {

        overlay.classList.remove(
            'is-open'
        );
    }


    $$('.drawer')
        .forEach((drawer) =>
            drawer.classList.remove(
                'is-open'
            )
        );


    setTimeout(() => {

        if (overlay) {

            overlay.classList.add(
                'hidden'
            );
        }


        $$('.drawer')
            .forEach((drawer) =>
                drawer.classList.add(
                    'hidden'
                )
            );

    }, 300);
}

function getOrderItems(order) {

    if (
        Array.isArray(order?.items)
    ) {

        return order.items;
    }


    if (
        Array.isArray(order?.orderItems)
    ) {

        return order.orderItems;
    }

    if (
        Array.isArray(order?.lines)
    ) {

        return order.lines;
    }


    if (
        Array.isArray(order?.orderLines)
    ) {

        return order.orderLines;
    }


    return [];
}


function getOrderTotal(order) {

    const total =
        order?.totalPrice ??
        order?.totalAmount ??
        order?.amount ??
        0;


    const number =
        Number(total);


    return Number.isFinite(number)
        ? number
        : 0;
}


function getOrderDate(order) {

    return (
        order?.orderDate ??
        order?.createdAt ??
        order?.creationDate ??
        order?.createdDate ??
        null
    );
}

function getOrderTableId(order) {

    const rawTableId =
        order?.tableId ??
        order?.tableID ??
        order?.table?.id ??
        order?.table?.tableId ??
        order?.table?.tableID ??
        null;


    if (
        rawTableId === null ||
        rawTableId === undefined ||
        rawTableId === ''
    ) {

        return null;
    }


    const numeric =
        Number(rawTableId);


    if (
        Number.isFinite(numeric) &&
        numeric > 0
    ) {

        return numeric;
    }


    return rawTableId;
}


function normalizeOrderTypeValue(order) {

    let raw =
        order?.orderType ??
        order?.type ??
        order?.orderKind ??
        order?.orderTypeName ??
        order?.orderTypeValue ??
        null;

    if (
        raw &&
        typeof raw === 'object'
    ) {

        raw =
            raw.name ??
            raw.label ??
            raw.value ??
            raw.type ??
            raw.orderType ??
            raw.id ??
            null;
    }

    if (typeof raw === 'string') {

        const original =
            raw.trim();


        const value =
            original
                .toLowerCase()
                .replace(/[\s_-]/g, '');

        if (
            value === 'dinein' ||
            value === 'dineinorder' ||
            value === 'dine'
        ) {

            return 'DineIn';
        }

        if (
            value === 'takeaway' ||
            value === 'takeawayorder' ||
            value === 'takeout' ||
            value === 'takeoutorder'
        ) {

            return 'TakeAway';
        }
    }

    const tableId =
        getOrderTableId(order);


    if (
        tableId !== null &&
        tableId !== undefined &&
        tableId !== '' &&
        (
            Number.isFinite(Number(tableId))
                ? Number(tableId) > 0
                : true
        )
    ) {

        return 'DineIn';
    }

    if (
        typeof raw === 'number' ||
        (
            typeof raw === 'string' &&
            raw.trim() !== '' &&
            !Number.isNaN(Number(raw))
        )
    ) {

        const numericValue =
            Number(raw);

        if (numericValue === 0) {

            return 'DineIn';
        }


        if (numericValue === 1) {

            return 'TakeAway';
        }
    }

    return '';
}


function getOrderType(order) {

    if (
        order?.orderType === 'DineIn' ||
        order?.orderType === 'TakeAway'
    ) {

        return order.orderType;
    }


    return normalizeOrderTypeValue(order);
}


function orderTypeLabel(order) {

    const type =
        getOrderType(order);

    if (type === 'TakeAway') {

        return `
            <span class="order-type order-type--takeaway">
                Takeaway
            </span>
        `;
    }

    if (type === 'DineIn') {

        const tableId =
            getOrderTableId(order);


        if (
            tableId !== null &&
            tableId !== undefined
        ) {

            return `
                <span class="order-type order-type--dinein">
                    Dine in · T${escapeHtml(
                String(tableId)
            )}
                </span>
            `;
        }


        return `
            <span class="order-type order-type--dinein">
                Dine in
            </span>
        `;
    }

    return `
        <span class="order-type">
            —
        </span>
    `;
}

function renderOverview() {

    const revenue =
        state.payments
            .filter(
                (p) =>
                    p.status === 'Paid'
            )
            .reduce(
                (sum, p) =>
                    sum +
                    (
                        Number(p.amount) ||
                        0
                    ),
                0
            );


    const openOrders =
        state.orders.filter(
            (o) =>
                o.status === 'Pending' ||
                o.status === 'Preparing' ||
                o.status === 'Ready'
        ).length;


    const activeReservations =
        state.reservations.filter(
            (r) =>
                r.status === 'Confirmed'
        ).length;


    const stats = [
        {
            icon: 'clipboard-list',
            label: 'Open orders',
            value: openOrders
        },
        {
            icon: 'banknote',
            label: 'Revenue collected',
            value: formatMoney(revenue)
        },
        {
            icon: 'calendar',
            label: 'Active reservations',
            value: activeReservations
        },
        {
            icon: 'coffee',
            label: 'Menu items',
            value: state.items.length
        }
    ];


    const statsGrid =
        $('#stats-grid');


    if (statsGrid) {

        statsGrid.innerHTML =
            stats
                .map(
                    (stat) => `
                        <div class="stat-card">

                            <div>

                                <span class="num">
                                    ${escapeHtml(
                        String(
                            stat.value
                        )
                    )}
                                </span>

                                <div class="lbl">
                                    ${stat.label}
                                </div>

                            </div>

                            <span class="ic">

                                <i
                                    data-lucide="${stat.icon}"
                                ></i>

                            </span>

                        </div>
                    `
                )
                .join('');
    }


    const recent =
        [...state.orders]
            .sort(
                (a, b) =>
                    Number(b.id || 0) -
                    Number(a.id || 0)
            )
            .slice(0, 6);


    const recentBody =
        $('#recent-orders-body');


    if (recentBody) {

        recentBody.innerHTML =
            recent.length
                ? recent
                    .map(
                        (order) => {

                            const items =
                                getOrderItems(order);


                            return `
                                <tr>

                                    <td>

                                        <strong>
                                            #${escapeHtml(
                                String(
                                    order.id
                                )
                            )}
                                        </strong>

                                    </td>


                                    <td>
                                        ${orderTypeLabel(
                                order
                            )}
                                    </td>


                                    <td>
                                        ${items.length}
                                        item(s)
                                    </td>


                                    <td>
                                        ${formatMoney(
                                getOrderTotal(
                                    order
                                )
                            )}
                                    </td>


                                    <td>
                                        ${statusChip(
                                order.status
                            )}
                                    </td>


                                    <td class="muted">
                                        ${formatDateTime(
                                getOrderDate(
                                    order
                                )
                            )}
                                    </td>

                                </tr>
                            `;
                        }
                    )
                    .join('')
                : `
                    <tr>

                        <td
                            colspan="6"
                            class="muted"
                        >
                            No orders yet.
                        </td>

                    </tr>
                `;
    }


    refreshIcons();
}

function renderOrdersAdmin() {

    const body =
        $('#orders-body');


    console.log(
        'ORDERS BODY ELEMENT:',
        body
    );


    console.log(
        'ORDERS TO RENDER:',
        state.orders
    );


    if (!body) {

        console.error(
            'ERROR: #orders-body was not found in the HTML.'
        );

        return;
    }


    const list =
        Array.isArray(state.orders)
            ? [...state.orders]
            : [];

    list.sort(
        (a, b) =>
            Number(b?.id || 0) -
            Number(a?.id || 0)
    );


    console.log(
        'ORDERS AFTER SORT:',
        list
    );


    if (list.length === 0) {

        body.innerHTML = `
            <tr>

                <td
                    colspan="7"
                    class="muted"
                >
                    No orders yet.
                </td>

            </tr>
        `;

        return;
    }


    body.innerHTML =
        list
            .map((order) => {

                const items =
                    getOrderItems(order);


                const itemsSummary =
                    items
                        .map((line) => {

                            const quantity =
                                Number(
                                    line?.quantity
                                ) || 0;


                            const name =
                                line?.menuItemName ||
                                line?.name ||
                                line?.menuItem?.name ||
                                (
                                    line?.menuItemId !== undefined &&
                                        line?.menuItemId !== null
                                        ? `#${line.menuItemId}`
                                        : 'Item'
                                );


                            return `
                                ${escapeHtml(
                                String(quantity)
                            )}×
                                ${escapeHtml(
                                String(name)
                            )}
                            `;
                        })
                        .join(', ');


                const options =
                    ORDER_STATUSES
                        .map(
                            (status) => {

                                const isSelected =
                                    String(
                                        order?.status ||
                                        ''
                                    ).toLowerCase() ===
                                    String(status)
                                        .toLowerCase();


                                return `
                                    <option
                                        value="${escapeHtml(
                                    status
                                )}"
                                        ${isSelected
                                        ? 'selected'
                                        : ''
                                    }
                                    >
                                        ${escapeHtml(
                                        status
                                    )}
                                    </option>
                                `;
                            }
                        )
                        .join('');


                return `
                    <tr>

                         

                        <td>

                            <strong>
                                #${escapeHtml(
                    String(
                        order?.id ??
                        '—'
                    )
                )}
                            </strong>

                        </td>


                         

                        <td>
                            ${orderTypeLabel(
                    order
                )}
                        </td>


                         

                        <td class="small">
                            ${itemsSummary || '—'}
                        </td>


                         

                        <td>
                            ${formatMoney(
                    getOrderTotal(
                        order
                    )
                )}
                        </td>


                         

                        <td class="muted small">
                            ${formatDateTime(
                    getOrderDate(
                        order
                    )
                )}
                        </td>


                         

                        <td>

                            <select
                                class="select select--inline"
                                data-order-status="${escapeHtml(
                    String(
                        order?.id ??
                        ''
                    )
                )}"
                            >

                                ${options}

                            </select>

                        </td>


                         

                        <td class="muted small">

                            ${escapeHtml(
                    order?.notes ||
                    order?.note ||
                    '—'
                )}

                        </td>

                    </tr>
                `;
            })
            .join('');


 
    $$(
        '[data-order-status]',
        body
    ).forEach((select) => {

        select.addEventListener(
            'change',
            () => {

                const orderId =
                    Number(
                        select.dataset.orderStatus
                    );


                updateOrderStatus(
                    orderId,
                    select.value
                );
            }
        );
    });


    refreshIcons();


    console.log(
        'ORDERS RENDERED SUCCESSFULLY:',
        list.length
    );
}
async function updateOrderStatus(
    orderId,
    status
) {

    try {

        await OrderAPI.updateStatus({
            id: orderId,
            status: status
        });


        const order =
            state.orders.find(
                (o) =>
                    Number(o.id) ===
                    Number(orderId)
            );


        if (order) {

            order.status =
                status;
        }


        showToast(
            `Order #${orderId} marked as ${status}.`
        );


        renderOrdersAdmin();

        renderOverview();


    } catch (error) {

        console.error(
            'UPDATE ORDER STATUS ERROR:',
            error
        );


        showToast(
            error?.message ||
            'Could not update order status.',
            'error'
        );


        await loadOrders();
    }
}

function categoryName(id) {

    const category =
        state.categories.find(
            (c) =>
                Number(c.id) ===
                Number(id)
        );


    return category
        ? category.name
        : `#${id}`;
}


function fillCategorySelect() {

    const select =
        $('#item-category');


    if (!select) return;


    select.innerHTML =
        state.categories
            .map(
                (c) =>
                    `
                        <option value="${c.id}">
                            ${escapeHtml(
                        c.name
                    )}
                        </option>
                    `
            )
            .join('');
}


function renderItems() {

    const body =
        $('#items-body');


    if (!body) return;


    const count =
        $('#items-count');


    if (count) {

        count.textContent =
            `${state.items.length} item(s) on the menu`;
    }


    if (
        state.items.length === 0
    ) {

        body.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    class="muted"
                >
                    No items yet — add your first one.
                </td>

            </tr>
        `;

        return;
    }


    body.innerHTML =
        state.items
            .map((item) => {

                const image =
                    resolveImageUrl(
                        item.imageUrl
                    );


                const thumb =
                    image
                        ? `
                            <img
                                class="thumb"
                                src="${escapeHtml(
                            image
                        )}"
                                alt=""
                                data-thumb
                            >
                        `
                        : `
                            <span class="thumb-fallback">
                                <i data-lucide="coffee"></i>
                            </span>
                        `;


                return `
                    <tr>

                        <td>
                            ${thumb}
                        </td>


                        <td>

                            <strong>
                                ${escapeHtml(
                    item.name
                )}
                            </strong>

                            <div class="muted small">

                                ${escapeHtml(
                    item.description || ''
                ).slice(0, 48) || '—'}

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                    categoryName(
                        item.categoryId
                    )
                )}
                        </td>


                        <td>
                            ${formatMoney(
                    item.price
                )}
                        </td>


                        <td>

                            <button
                                type="button"
                                class="btn btn--ghost btn--sm avail-dot ${item.isAvailable === false
                        ? 'avail-dot--off'
                        : ''
                    }"
                                data-toggle-item="${item.id}"
                            >

                                ${item.isAvailable === false
                        ? 'Sold out'
                        : 'Available'
                    }

                            </button>

                        </td>


                        <td>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    class="icon-btn icon-btn--sm"
                                    data-edit-item="${item.id}"
                                    title="Edit"
                                >
                                    <i data-lucide="pencil"></i>
                                </button>


                                <button
                                    type="button"
                                    class="icon-btn icon-btn--sm icon-btn--danger"
                                    data-delete-item="${item.id}"
                                    title="Delete"
                                >
                                    <i data-lucide="trash-2"></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            })
            .join('');


    $$(
        'img[data-thumb]',
        body
    ).forEach((img) => {

        img.addEventListener(
            'error',
            () => {

                const fallback =
                    document.createElement(
                        'span'
                    );


                fallback.className =
                    'thumb-fallback';


                fallback.innerHTML =
                    '<i data-lucide="coffee"></i>';


                img.replaceWith(
                    fallback
                );


                refreshIcons();
            }
        );
    });


    $$(
        '[data-toggle-item]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () =>
                toggleItemAvailability(
                    Number(
                        btn.dataset.toggleItem
                    )
                )
        )
    );


    $$(
        '[data-edit-item]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () => {

                const item =
                    state.items.find(
                        (i) =>
                            Number(i.id) ===
                            Number(
                                btn.dataset.editItem
                            )
                    );


                openItemDrawer(item);
            }
        )
    );


    $$(
        '[data-delete-item]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () =>
                deleteItem(
                    Number(
                        btn.dataset.deleteItem
                    )
                )
        )
    );


    refreshIcons();
}


function openItemDrawer(item) {

    $('#item-drawer-title').textContent =
        item
            ? `Edit “${item.name}”`
            : 'New menu item';


    $('#item-id').value =
        item
            ? item.id
            : '';


    $('#item-name').value =
        item
            ? item.name
            : '';


    $('#item-category').value =
        item
            ? item.categoryId
            : (
                $('#item-category')
                    .options[0]
                    ?.value ||
                ''
            );


    $('#item-price').value =
        item
            ? item.price
            : '';


    $('#item-description').value =
        item
            ? item.description || ''
            : '';


    $('#item-image').value =
        item
            ? item.imageUrl || ''
            : '';


    $('#item-available').checked =
        item
            ? item.isAvailable !== false
            : true;


    openPanel(
        $('#item-drawer')
    );
}


async function saveItem() {

    const id =
        $('#item-id').value;


    const name =
        $('#item-name')
            .value
            .trim();


    const categoryId =
        Number(
            $('#item-category').value
        );


    const price =
        Number(
            $('#item-price').value
        );


    if (
        !name ||
        !categoryId ||
        Number.isNaN(price) ||
        price < 0
    ) {

        showToast(
            'Please give the item a name, a category and a valid price.',
            'info'
        );

        return;
    }


    const dto = {

        categoryId,

        name,

        price,

        description:
            $('#item-description')
                .value
                .trim() ||
            null,

        imageUrl:
            $('#item-image')
                .value
                .trim() ||
            null,

        isAvailable:
            $('#item-available')
                .checked,
    };


    if (id) {

        dto.id =
            Number(id);
    }


    const button =
        $('#item-save');


    button.disabled =
        true;


    try {

        if (id) {

            await MenuItemAPI.update(
                dto
            );

        } else {

            await MenuItemAPI.create(
                dto
            );
        }


        showToast(
            id
                ? 'Item updated.'
                : 'Item added to the menu.'
        );


        closePanels();

        await loadItems();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not save item.',
            'error'
        );


    } finally {

        button.disabled =
            false;
    }
}


async function toggleItemAvailability(id) {

    const item =
        state.items.find(
            (i) =>
                Number(i.id) ===
                id
        );


    if (!item) return;


    try {

        await MenuItemAPI.update({

            ...item,

            isAvailable:
                item.isAvailable === false
        });


        item.isAvailable =
            item.isAvailable === false;


        renderItems();


        showToast(
            item.isAvailable
                ? `"${item.name}" is available again.`
                : `"${item.name}" marked as sold out.`
        );


    } catch (error) {

        showToast(
            error?.message ||
            'Could not update item availability.',
            'error'
        );
    }
}


async function deleteItem(id) {

    const item =
        state.items.find(
            (i) =>
                Number(i.id) ===
                id
        );


    const confirmed =
        await confirmDialog({

            title:
                `Delete “${item
                    ? item.name
                    : 'this item'
                }”?`,

            message:
                'It will disappear from the menu for everyone.',

            confirmText:
                'Delete item',
        });


    if (!confirmed) return;


    try {

        await MenuItemAPI.remove(id);


        showToast(
            'Item deleted.'
        );


        await loadItems();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not delete item.',
            'error'
        );
    }
}
function renderCategories() {

    const grid =
        $('#categories-grid');


    if (!grid) return;


    const count =
        $('#categories-count');


    if (count) {

        count.textContent =
            `${state.categories.length} categor${state.categories.length === 1
                ? 'y'
                : 'ies'
            }`;
    }


    if (
        state.categories.length === 0
    ) {

        grid.innerHTML =
            emptyState(
                'tag',
                'No categories yet',
                'Create one to organise the menu.'
            );


        refreshIcons();

        return;
    }


    grid.innerHTML =
        state.categories
            .map((cat) => {

                const itemCount =
                    state.items.filter(
                        (i) =>
                            Number(
                                i.categoryId
                            ) ===
                            Number(
                                cat.id
                            )
                    ).length;


                return `
                    <div class="admin-cat-card">

                        <div>

                            <h3>
                                ${escapeHtml(
                    cat.name
                )}
                            </h3>


                            <p>
                                ${escapeHtml(
                    cat.description ||
                    'No description yet.'
                )}
                            </p>


                            <p class="small muted mt-1">

                                ${itemCount}
                                item(s)

                            </p>

                        </div>


                        <div class="row-actions">

                            <button
                                type="button"
                                class="icon-btn icon-btn--sm"
                                data-edit-cat="${cat.id}"
                                title="Edit"
                            >
                                <i data-lucide="pencil"></i>
                            </button>


                            <button
                                type="button"
                                class="icon-btn icon-btn--sm icon-btn--danger"
                                data-delete-cat="${cat.id}"
                                title="Delete"
                            >
                                <i data-lucide="trash-2"></i>
                            </button>

                        </div>

                    </div>
                `;
            })
            .join('');


    $$(
        '[data-edit-cat]',
        grid
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () => {

                const cat =
                    state.categories.find(
                        (c) =>
                            Number(c.id) ===
                            Number(
                                btn.dataset.editCat
                            )
                    );


                openCategoryDrawer(cat);
            }
        )
    );


    $$(
        '[data-delete-cat]',
        grid
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () =>
                deleteCategory(
                    Number(
                        btn.dataset.deleteCat
                    )
                )
        )
    );


    refreshIcons();
}


function openCategoryDrawer(cat) {

    $('#category-drawer-title').textContent =
        cat
            ? `Edit “${cat.name}”`
            : 'New category';


    $('#category-id').value =
        cat
            ? cat.id
            : '';


    $('#category-name').value =
        cat
            ? cat.name
            : '';


    $('#category-description').value =
        cat
            ? cat.description || ''
            : '';


    openPanel(
        $('#category-drawer')
    );
}


async function saveCategory() {

    const id =
        $('#category-id').value;


    const name =
        $('#category-name')
            .value
            .trim();


    if (!name) {

        showToast(
            'A category needs a name.',
            'info'
        );

        return;
    }


    const dto = {

        name,

        description:
            $('#category-description')
                .value
                .trim() ||
            null
    };


    if (id) {

        dto.id =
            Number(id);
    }


    const button =
        $('#category-save');


    button.disabled =
        true;


    try {

        if (id) {

            await CategoryAPI.update(
                dto
            );

        } else {

            await CategoryAPI.create(
                dto
            );
        }


        showToast(
            id
                ? 'Category updated.'
                : 'Category created.'
        );


        closePanels();


        await loadCategories();

        renderItems();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not save category.',
            'error'
        );


    } finally {

        button.disabled =
            false;
    }
}


async function deleteCategory(id) {

    const cat =
        state.categories.find(
            (c) =>
                Number(c.id) ===
                id
        );


    const confirmed =
        await confirmDialog({

            title:
                `Delete “${cat
                    ? cat.name
                    : 'this category'
                }”?`,

            message:
                'Items inside it may need a new home afterwards.',

            confirmText:
                'Delete category',
        });


    if (!confirmed) return;


    try {

        await CategoryAPI.remove(id);


        showToast(
            'Category deleted.'
        );


        await loadCategories();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not delete category.',
            'error'
        );
    }
}
function renderTablesAdmin() {

    const body =
        $('#tables-body');


    if (!body) return;


    const count =
        $('#tables-count');


    if (count) {

        count.textContent =
            `${state.tables.length} table(s) in the house`;
    }


    if (
        state.tables.length === 0
    ) {

        body.innerHTML = `
            <tr>

                <td
                    colspan="4"
                    class="muted"
                >
                    No tables configured yet.
                </td>

            </tr>
        `;

        return;
    }


    body.innerHTML =
        [...state.tables]
            .sort(
                (a, b) =>
                    Number(a.tableNumber) -
                    Number(b.tableNumber)
            )
            .map(
                (table) => `
                    <tr>

                        <td>

                            <strong>
                                Table
                                ${escapeHtml(
                    table.tableNumber ??
                    table.id
                )}
                            </strong>

                        </td>


                        <td>

                            ${escapeHtml(
                    table.capacity ??
                    '—'
                )}

                            seats

                        </td>


                        <td>

                            <button
                                type="button"
                                class="btn btn--ghost btn--sm avail-dot ${table.isAvailable === false
                        ? 'avail-dot--off'
                        : ''
                    }"
                                data-toggle-table="${table.id}"
                            >

                                ${table.isAvailable === false
                        ? 'Taken'
                        : 'Available'
                    }

                            </button>

                        </td>


                        <td>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    class="icon-btn icon-btn--sm"
                                    data-edit-table="${table.id}"
                                    title="Edit"
                                >
                                    <i data-lucide="pencil"></i>
                                </button>


                                <button
                                    type="button"
                                    class="icon-btn icon-btn--sm icon-btn--danger"
                                    data-delete-table="${table.id}"
                                    title="Delete"
                                >
                                    <i data-lucide="trash-2"></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `
            )
            .join('');


    $$(
        '[data-toggle-table]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () =>
                toggleTableAvailability(
                    Number(
                        btn.dataset.toggleTable
                    )
                )
        )
    );


    $$(
        '[data-edit-table]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () => {

                const table =
                    state.tables.find(
                        (t) =>
                            Number(t.id) ===
                            Number(
                                btn.dataset.editTable
                            )
                    );


                openTableDrawer(table);
            }
        )
    );


    $$(
        '[data-delete-table]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () =>
                deleteTable(
                    Number(
                        btn.dataset.deleteTable
                    )
                )
        )
    );


    refreshIcons();
}


function openTableDrawer(table) {

    $('#table-drawer-title').textContent =
        table
            ? `Edit table ${table.tableNumber}`
            : 'New table';


    $('#table-id').value =
        table
            ? table.id
            : '';


    $('#table-number').value =
        table
            ? table.tableNumber
            : '';


    $('#table-capacity').value =
        table
            ? table.capacity
            : '';


    $('#table-available').checked =
        table
            ? table.isAvailable !== false
            : true;


    openPanel(
        $('#table-drawer')
    );
}


async function saveTable() {

    const id =
        $('#table-id').value;


    const tableNumber =
        Number(
            $('#table-number').value
        );


    const capacity =
        Number(
            $('#table-capacity').value
        );


    if (
        !tableNumber ||
        !capacity
    ) {

        showToast(
            'Please set a table number and its capacity.',
            'info'
        );

        return;
    }


    const dto = {

        tableNumber,

        capacity,
    };


    if (id) {

        dto.id =
            Number(id);
    }


    const button =
        $('#table-save');


    button.disabled =
        true;


    try {

        if (id) {

            await TableAPI.update(
                dto
            );

        } else {

            await TableAPI.create(
                dto
            );
        }


        showToast(
            id
                ? 'Table updated.'
                : 'Table added.'
        );


        closePanels();


        await loadTables();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not save table.',
            'error'
        );


    } finally {

        button.disabled =
            false;
    }
}


async function toggleTableAvailability(id) {

    const table =
        state.tables.find(
            (t) =>
                Number(t.id) ===
                id
        );


    if (!table) return;


    try {

        await TableAPI.update({

            ...table,

            isAvailable:
                table.isAvailable === false
        });


        table.isAvailable =
            table.isAvailable === false;


        renderTablesAdmin();


        showToast(
            table.isAvailable
                ? `Table ${table.tableNumber} is available.`
                : `Table ${table.tableNumber} marked as taken.`
        );


    } catch (error) {

        showToast(
            error?.message ||
            'Could not update table availability.',
            'error'
        );
    }
}


async function deleteTable(id) {

    const confirmed =
        await confirmDialog({

            title:
                'Delete this table?',

            message:
                'Reservations attached to it may be affected on the server.',

            confirmText:
                'Delete table',
        });


    if (!confirmed) return;


    try {

        await TableAPI.remove(id);


        showToast(
            'Table deleted.'
        );


        await loadTables();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not delete table.',
            'error'
        );
    }
}
function renderReservations() {

    const body =
        $('#reservations-body');


    if (!body) return;


    const list =
        [...state.reservations]
            .sort(
                (a, b) =>
                    `${a.reservationDate} ${a.reservationTime}`
                        .localeCompare(
                            `${b.reservationDate} ${b.reservationTime}`
                        )
            );


    const count =
        $('#reservations-count');


    if (count) {

        count.textContent =
            `${list.length} reservation(s) on the books`;
    }


    if (list.length === 0) {

        body.innerHTML = `
            <tr>

                <td
                    colspan="8"
                    class="muted"
                >
                    No reservations yet.
                </td>

            </tr>
        `;

        return;
    }


    body.innerHTML =
        list
            .map((res) => {

                const table =
                    state.tables.find(
                        (t) =>
                            Number(t.id) ===
                            Number(res.tableId)
                    );


                const options =
                    RESERVATION_STATUSES
                        .map(
                            (status) =>
                                `
                                    <option
                                        value="${escapeHtml(
                                    status
                                )}"
                                        ${res.status ===
                                    status
                                    ? 'selected'
                                    : ''
                                }
                                    >
                                        ${escapeHtml(
                                    status
                                )}
                                    </option>
                                `
                        )
                        .join('');


                return `
                    <tr>

                        <td>

                            <strong>
                                #${escapeHtml(
                    String(
                        res.id
                    )
                )}
                            </strong>

                        </td>


                        <td>

                            ${table
                        ? `Table ${escapeHtml(
                            String(
                                table.tableNumber
                            )
                        )}`
                        : `#${escapeHtml(
                            String(
                                res.tableId
                            )
                        )}`
                    }

                        </td>


                        <td>
                            ${formatDate(
                        res.reservationDate
                    )}
                        </td>


                        <td>
                            ${formatTime(
                        res.reservationTime ??
                        res.startTime
                    )}
                        </td>


                        <td>

                            ${escapeHtml(
                        String(
                            res.partySize ??
                            res.numberOfGuests ??
                            ''
                        )
                    )}

                        </td>


                        <td class="muted small">

                            ${escapeHtml(
                        res.notes ||
                        '—'
                    )}

                        </td>


                        <td>

                            <select
                                class="select select--inline"
                                data-res-status="${escapeHtml(
                        String(
                            res.id
                        )
                    )}"
                            >

                                ${options}

                            </select>

                        </td>


                        <td>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    class="icon-btn icon-btn--sm icon-btn--danger"
                                    data-delete-res="${escapeHtml(
                        String(
                            res.id
                        )
                    )}"
                                    title="Delete"
                                >
                                    <i data-lucide="trash-2"></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            })
            .join('');


    $$(
        '[data-res-status]',
        body
    ).forEach((select) =>
        select.addEventListener(
            'change',
            () =>
                updateReservationStatus(
                    Number(
                        select.dataset.resStatus
                    ),
                    select.value
                )
        )
    );


    $$(
        '[data-delete-res]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () =>
                deleteReservation(
                    Number(
                        btn.dataset.deleteRes
                    )
                )
        )
    );


    refreshIcons();
}


async function updateReservationStatus(id, status) {

    const reservation =
        state.reservations.find(
            (r) =>
                Number(r.id) === id
        );

    if (!reservation) return;

    try {

        const dto = {
            id: reservation.id,

            reservationDate:
                reservation.reservationDate,

            startTime:
                reservation.startTime ??
                reservation.reservationTime,

            endTime:
                reservation.endTime,

            numberOfGuests:
                reservation.numberOfGuests ??
                reservation.partySize,

            tableId:
                reservation.tableId,

            status:
                status
        };

        console.log(
            'RESERVATION UPDATE BODY:',
            dto
        );

        await ReservationAPI.update(dto);

        reservation.status = status;

        showToast(
            `Reservation #${id} marked as ${status}.`
        );

        renderReservations();
        renderOverview();

    } catch (error) {

        console.error(
            'UPDATE RESERVATION STATUS ERROR:',
            error
        );

        console.error(
            'ERROR DETAILS:',
            error.details
        );

        showToast(
            error?.message ||
            'Could not update reservation.',
            'error'
        );

        await loadReservations();
    }
}


async function deleteReservation(id) {

    const confirmed =
        await confirmDialog({

            title:
                `Delete reservation #${id}?`,

            message:
                'This removes the booking record entirely.',

            confirmText:
                'Delete',
        });


    if (!confirmed) return;


    try {

        await ReservationAPI.remove(id);


        showToast(
            'Reservation deleted.'
        );


        await loadReservations();

        renderOverview();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not delete reservation.',
            'error'
        );
    }
}

function renderPayments() {

    const body =
        $('#payments-body');


    if (!body) return;


    const list =
        [...state.payments]
            .sort(
                (a, b) =>
                    Number(b.id) -
                    Number(a.id)
            );


    const count =
        $('#payments-count');


    if (count) {

        count.textContent =
            `${list.length} payment record(s)`;
    }


    if (list.length === 0) {

        body.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    class="muted"
                >
                    No payments recorded yet.
                </td>

            </tr>
        `;

        return;
    }


    body.innerHTML =
        list
            .map(
                (payment) => `
                    <tr>

                        <td>

                            <strong>
                                #${escapeHtml(
                    String(
                        payment.id
                    )
                )}
                            </strong>

                        </td>


                        <td>

                            Order #${escapeHtml(
                    String(
                        payment.orderId
                    )
                )}

                        </td>


                        <td>

                            ${formatMoney(
                    payment.amount
                )}

                        </td>


                        <td>

                            <span class="chip">

                                ${escapeHtml(
                    String(
                        payment.method ||
                        '—'
                    )
                )}

                            </span>

                        </td>


                        <td>

                            ${statusChip(
                    payment.status
                )}

                        </td>


                        <td>

                            <div class="row-actions">

                                ${payment.status !==
                        'Paid'

                        ? `
                                            <button
                                                type="button"
                                                class="btn btn--outline btn--sm"
                                                data-mark-paid="${escapeHtml(
                            String(
                                payment.orderId
                            )
                        )}"
                                                data-method="${escapeHtml(
                            payment.method ||
                            'Cash'
                        )}"
                                            >

                                                <i data-lucide="check"></i>

                                                Mark paid

                                            </button>
                                        `
                        : ''
                    }

                            </div>

                        </td>

                    </tr>
                `
            )
            .join('');


    $$(
        '[data-mark-paid]',
        body
    ).forEach((btn) =>
        btn.addEventListener(
            'click',
            () =>
                markPaymentPaid(
                    Number(
                        btn.dataset.markPaid
                    ),
                    btn.dataset.method
                )
        )
    );


    refreshIcons();
}


async function savePayment() {

    const orderId =
        Number(
            $('#payment-order-id').value
        );


    const amount =
        Number(
            $('#payment-amount').value
        );


    const method =
        $('#payment-method').value;


    if (
        !orderId ||
        Number.isNaN(amount) ||
        amount <= 0
    ) {

        showToast(
            'Please provide an order ID and a valid amount.',
            'info'
        );

        return;
    }


    const button =
        $('#payment-save');


    button.disabled =
        true;


    try {

        await PaymentAPI.create({

            orderId,

            amount,

            method
        });


        showToast(
            'Payment record created.'
        );


        closePanels();


        $('#payment-form').reset();


        await loadPayments();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not create payment.',
            'error'
        );


    } finally {

        button.disabled =
            false;
    }
}


async function markPaymentPaid(
    orderId,
    method
) {

    try {

        await PaymentAPI.pay(
            orderId,
            method
        );


        showToast(
            `Order #${orderId} is now paid.`
        );


        await loadPayments();

        renderOverview();


    } catch (error) {

        showToast(
            error?.message ||
            'Could not mark payment as paid.',
            'error'
        );
    }
}
