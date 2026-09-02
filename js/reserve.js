let tablesCache = [];
let selectedTableId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    $('#res-date').min =
        new Date().toISOString().slice(0, 10);

    $('#reserve-form').addEventListener(
        'submit',
        handleReserve
    );

    $('#res-refresh').addEventListener(
        'click',
        loadMyReservations
    );

    loadTables();
    loadMyReservations();
});

async function loadTables() {

    const grid = $('#tables-grid');

    try {

        const tables =
            await TableAPI.list();

        tablesCache =
            Array.isArray(tables)
                ? tables
                : [];

        if (tablesCache.length === 0) {

            grid.innerHTML =
                emptyState(
                    'armchair',
                    'No tables yet',
                    'Please check back soon.'
                );

            refreshIcons();
            return;
        }

        renderTables();

    } catch (error) {

        console.error(
            'TABLES ERROR:',
            error
        );

        grid.innerHTML =
            emptyState(
                'armchair',
                'Could not load tables',
                error.message
            );

        refreshIcons();
    }
}


function renderTables() {

    const grid =
        $('#tables-grid');

    grid.innerHTML =
        tablesCache
            .map((table) => {

                const busy =
                    table.isAvailable === false;

                const selected =
                    Number(selectedTableId) ===
                    Number(table.id);

                return `
                    <button
                        type="button"
                        class="table-card
                            ${selected ? 'is-selected' : ''}
                            ${busy ? 'is-busy' : ''}"
                        data-table="${table.id}"
                        ${busy ? 'disabled' : ''}>

                        <span class="t-no">
                            ${escapeHtml(
                    table.tableNumber ??
                    table.id
                )}
                        </span>

                        <span class="t-cap">
                            <i data-lucide="users"></i>
                            seats
                            ${escapeHtml(
                    table.capacity ?? '—'
                )}
                        </span>

                        <span class="t-state">
                            ${busy
                        ? 'Taken'
                        : 'Available'}
                        </span>

                    </button>
                `;
            })
            .join('');

    $$('[data-table]', grid)
        .forEach((card) => {

            card.addEventListener(
                'click',
                () => {

                    selectedTableId =
                        Number(
                            card.dataset.table
                        );

                    renderTables();
                }
            );

        });

    refreshIcons();
}

async function handleReserve(event) {

    event.preventDefault();

    if (!selectedTableId) {

        showToast(
            'Please pick a table first.',
            'info'
        );

        return;
    }

    const date =
        $('#res-date').value;

    const time =
        $('#res-time').value;

    const partySize =
        Number(
            $('#res-party').value
        );

    if (
        !date ||
        !time ||
        !partySize ||
        partySize < 1
    ) {

        showToast(
            'Please complete the date, time and party size.',
            'info'
        );

        return;
    }
    

    const dto = {

        tableId:
            selectedTableId,

        reservationDate:
            date,

        reservationTime:
            `${time}:00`,

        partySize:
            partySize,

        notes:
            $('#res-notes').value.trim() ||
            null
    };


    console.log(
        'RESERVATION DTO FROM PAGE:',
        dto
    );


    const button =
        $('#reserve-submit');

    button.disabled = true;

    button.textContent =
        'Saving your table…';


    try {

        await ReservationAPI.create(dto);

        showToast(
            'Your table is reserved. See you soon!'
        );


        $('#reserve-form').reset();

        $('#res-time').value =
            '18:00';

        selectedTableId =
            null;

        renderTables();
        

        await loadMyReservations();

    } catch (error) {

        console.error(
            'RESERVATION ERROR:',
            error
        );

        showToast(
            error.message,
            'error'
        );

    } finally {

        button.disabled = false;

        button.innerHTML =
            'Confirm reservation ' +
            '<i data-lucide="calendar-check"></i>';

        refreshIcons();
    }
}

async function loadMyReservations() {

    const mount =
        $('#my-reservations');

    mount.innerHTML =
        '<div class="spinner"></div>';


    try {

        const reservations =
            await apiRequest(
                `/Reservation?_t=${Date.now()}`,
                {
                    method: 'GET',
                    auth: true
                }
            );


        console.log(
            'LATEST RESERVATIONS FROM API:',
            reservations
        );


        const list =
            Array.isArray(reservations)
                ? reservations
                : [];


        if (list.length === 0) {

            mount.innerHTML =
                emptyState(
                    'calendar',
                    'No reservations yet',
                    'Your upcoming tables will appear right here.'
                );

            refreshIcons();
            return;
        }
        

        list.sort((a, b) => {

            const dateA =
                String(
                    a.reservationDate ?? ''
                );

            const dateB =
                String(
                    b.reservationDate ?? ''
                );

            if (dateA !== dateB) {
                return dateA.localeCompare(
                    dateB
                );
            }

            const timeA =
                String(
                    a.startTime ??
                    a.reservationTime ??
                    ''
                );

            const timeB =
                String(
                    b.startTime ??
                    b.reservationTime ??
                    ''
                );

            return timeA.localeCompare(
                timeB
            );
        });


        mount.innerHTML =
            list
                .map(reservationLineHtml)
                .join('');


        $$(
            '[data-cancel]',
            mount
        ).forEach((btn) => {

            btn.addEventListener(
                'click',
                () =>
                    cancelReservation(
                        Number(
                            btn.dataset.cancel
                        )
                    )
            );

        });


        refreshIcons();


    } catch (error) {

        console.error(
            'LOAD RESERVATIONS ERROR:',
            error
        );


        mount.innerHTML =
            emptyState(
                'calendar',
                'Could not load reservations',
                error.message
            );


        refreshIcons();
    }
}

function reservationLineHtml(
    reservation
) {

    const table =
        tablesCache.find(
            (t) =>
                Number(t.id) ===
                Number(
                    reservation.tableId
                )
        );


    const tableLabel =
        table
            ? `Table ${table.tableNumber ??
            table.id
            }`
            : `Table #${reservation.tableId
            }`;


    const rawStatus =
        reservation.status ?? '';

    const normalizedStatus =
        String(rawStatus)
            .trim()
            .toLowerCase();


    const cancellable =
        normalizedStatus ===
        'confirmed';


    const guests =
        reservation.numberOfGuests ??
        reservation.partySize ??
        '';


    const startTime =
        reservation.startTime ??
        reservation.reservationTime;


    return `
        <div class="res-line">

            <div class="res-info">

                <strong>
                    ${escapeHtml(
        tableLabel
    )}
                    ·
                    ${formatDate(
        reservation.reservationDate
    )}
                    at
                    ${formatTime(
        startTime
    )}
                </strong>


                <span>

                    ${escapeHtml(
        guests
    )}

                    guest${Number(
        guests
    ) > 1 ? 's' : ''}

                    ${reservation.notes
            ? ' · ' +
            escapeHtml(
                reservation.notes
            )
            : ''
        }

                </span>

            </div>


            <div class="res-side">

                ${statusChip(
            rawStatus
        )}


                ${cancellable
            ? `
                            <button
                                type="button"
                                class="icon-btn
                                       icon-btn--sm
                                       icon-btn--danger"
                                data-cancel="${reservation.id
            }"
                                title="Cancel reservation"
                                aria-label="Cancel reservation">

                                <i
                                    data-lucide="x">
                                </i>

                            </button>
                        `
            : ''
        }

            </div>

        </div>
    `;
}

async function cancelReservation(id) {

    const confirmed =
        await confirmDialog({

            title:
                'Cancel this reservation?',

            message:
                'The table will be released for other guests.',

            confirmText:
                'Yes, cancel it'
        });


    if (!confirmed) {
        return;
    }


    try {

        await ReservationAPI.remove(id);

        showToast(
            'Reservation cancelled.'
        );


        await loadMyReservations();


    } catch (error) {

        console.error(
            'CANCEL RESERVATION ERROR:',
            error
        );

        showToast(
            error.message,
            'error'
        );
    }
}