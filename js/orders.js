let payingOrder = null;

const STATUS_STEPS = [
    'Pending',
    'Preparing',
    'Ready',
    'Completed'
];

document.addEventListener('DOMContentLoaded', () => {

    if (!requireAuth()) return;


    const refreshButton =
        $('#orders-refresh');

    const payCancelButton =
        $('#pay-cancel');

    const payOverlay =
        $('#pay-overlay');

    const payConfirmButton =
        $('#pay-confirm');
        
    if (refreshButton) {

        refreshButton.addEventListener(
            'click',
            loadOrders
        );
    }
    
    if (payCancelButton) {

        payCancelButton.addEventListener(
            'click',
            closePayModal
        );
    }
    
    if (payOverlay) {

        payOverlay.addEventListener(
            'click',
            (event) => {

                if (
                    event.target === payOverlay
                ) {

                    closePayModal();
                }
            }
        );
    }
    
    if (payConfirmButton) {

        payConfirmButton.addEventListener(
            'click',
            confirmPayment
        );
    }
    
    loadOrders();
});

async function loadOrders() {

    const mount =
        $('#orders-list');

    const count =
        $('#orders-count');


    if (!mount) return;


    mount.innerHTML =
        '<div class="spinner"></div>';


    if (count) {

        count.textContent = '';
    }


    try {
        
        const orders =
            await OrderAPI.list();


        console.log(
            'ORDERS API RESPONSE:',
            orders
        );
        
        let payments = [];


        try {

            payments =
                await PaymentAPI.list();


            console.log(
                'PAYMENTS API RESPONSE:',
                payments
            );

        } catch (paymentError) {

            console.error(
                'LOAD PAYMENTS ERROR:',
                paymentError
            );
            
            payments = [];
        }
        
        const list = (

            Array.isArray(orders)
                ? orders
                : []

        ).sort(

            (a, b) =>
                Number(b.id || 0) -
                Number(a.id || 0)
        );
        
        if (list.length === 0) {

            mount.innerHTML =
                emptyState(
                    'shopping-bag',
                    'No orders yet',
                    'Head to the menu and your first order will show up here.'
                );


            refreshIcons();

            return;
        }
        
        if (count) {

            count.textContent =
                `${list.length} order${list.length > 1 ? 's' : ''} on record`;
        }
        
        mount.innerHTML =
            list
                .map((order) => {

                    const payment =
                        payments.find(
                            (p) => {

                                const paymentOrderId =
                                    Number(
                                        p?.orderId ??
                                        p?.OrderId
                                    );

                                return (
                                    paymentOrderId ===
                                    Number(order.id)
                                );
                            }
                        );


                    return orderCardHtml(
                        order,
                        payment
                    );
                })
                .join('');

        $$('[data-pay]', mount).forEach(
            (button) => {

                button.addEventListener(
                    'click',
                    async () => {

                        const orderId =
                            Number(
                                button.dataset.pay
                            );


                        const order =
                            list.find(
                                (item) =>
                                    Number(item.id) ===
                                    orderId
                            );


                        if (!order) {

                            return;
                        }
                        
                        try {

                            const currentPayments =
                                await PaymentAPI.list();


                            const payment =
                                currentPayments.find(
                                    (p) => {

                                        const paymentOrderId =
                                            Number(
                                                p?.orderId ??
                                                p?.OrderId
                                            );

                                        return (
                                            paymentOrderId ===
                                            orderId
                                        );
                                    }
                                );


                            const paymentStatus =
                                String(
                                    payment?.status ??
                                    payment?.Status ??
                                    ''
                                )
                                    .trim()
                                    .toLowerCase();


                            const isPaid =
                                paymentStatus === 'paid' ||
                                paymentStatus === '1';


                            if (isPaid) {

                                showToast(
                                    'This order has already been paid.',
                                    'error'
                                );


                                await loadOrders();


                                return;
                            }

                        } catch (error) {

                            console.error(
                                'PAYMENT STATUS CHECK ERROR:',
                                error
                            );
                        }


                        payingOrder =
                            order;


                        openPayModal();
                    }
                );
            }
        );

        refreshIcons();


    } catch (error) {

        console.error(
            'LOAD ORDERS ERROR:',
            error
        );


        mount.innerHTML =
            emptyState(
                'shopping-bag',
                'Could not load your orders',
                error.message ||
                'Unexpected error.'
            );


        refreshIcons();
    }
}

function orderCardHtml(
    order,
    payment = null
) {
    
    const items =
        Array.isArray(order.items)
            ? order.items
            : [];


    const itemsHtml =
        items.length

            ? items
                .map((line) => {

                    const quantity =
                        Number(
                            line.quantity
                        ) || 0;


                    const unitPrice =
                        Number(
                            line.unitPrice
                        ) || 0;


                    const lineTotal =
                        unitPrice *
                        quantity;


                    const itemName =
                        line.menuItemName ||
                        `Item #${line.menuItemId}`;


                    return `
            <div class="order-line">

              <span>
                ${escapeHtml(quantity)}
                ×
                ${escapeHtml(itemName)}
              </span>

              <span>
                ${formatMoney(lineTotal)}
              </span>

            </div>
          `;
                })
                .join('')

            : `
        <p class="muted small">
          No item details on this record.
        </p>
      `;

    const status =
        order.status ||
        'Pending';
        
    const stepperHtml =
        status === 'Cancelled'

            ? `
          <p class="muted small mt-1">
            This order was cancelled.
          </p>
        `

            : buildStepper(status);

    const paymentStatus =
        String(
            payment?.status ??
            payment?.Status ??
            ''
        )
            .trim()
            .toLowerCase();


    const isPaid =
        paymentStatus === 'paid' ||
        paymentStatus === '1';

    const canPay =
        !isPaid &&
        status !== 'Cancelled' &&
        status !== 'Completed';

    const dateText =
        order.orderDate

            ? formatDateTime(
                order.orderDate
            )

            : '—';

            
    const total =
        Number(
            order.totalPrice
        ) || 0;

    let paymentButtonHtml = '';


    if (isPaid) {


        paymentButtonHtml = `
          <button
            type="button"
            class="btn btn--sm payment-paid"
            disabled
            aria-disabled="true"
            title="This order has already been paid"
          >
            <i data-lucide="check-circle"></i>
            Paid
          </button>
        `;

    } else if (canPay) {

        paymentButtonHtml = `
          <button
            type="button"
            class="btn btn--accent btn--sm"
            data-pay="${escapeHtml(order.id)}"
          >
            <i data-lucide="banknote"></i>
            Pay now
          </button>
        `;
    }
    
    return `
    <article class="order-card">

      <div class="order-head">

        <div>

          <span class="order-id">
            Order #${escapeHtml(order.id)}
          </span>

          <span class="order-meta">
            · ${escapeHtml(dateText)}
          </span>

        </div>

        ${statusChip(status)}

      </div>


      ${stepperHtml}


      <div class="order-items">
        ${itemsHtml}
      </div>


      <div class="order-foot">

        <span class="order-total">
          ${formatMoney(total)}
        </span>


        ${paymentButtonHtml}

      </div>

    </article>
  `;
}

function buildStepper(status) {
    

    let currentIndex =
        STATUS_STEPS.indexOf(status);


    if (currentIndex === -1) {

        currentIndex = 0;
    }


    const steps =
        STATUS_STEPS.map(
            (label, index) => {


                const stateClass =
                    index < currentIndex

                        ? 'is-done'

                        : index === currentIndex

                            ? 'is-current'

                            : '';


                const dot =
                    index < currentIndex

                        ? `
              <span class="dot">
                <i data-lucide="check"></i>
              </span>
            `

                        : `
              <span class="dot"></span>
            `;


                const line =
                    index <
                        STATUS_STEPS.length - 1

                        ? '<span class="step-line"></span>'

                        : '';


                return `
        <span class="step ${stateClass}">

          ${dot}

          ${escapeHtml(label)}

        </span>

        ${line}
      `;
            }
        );


    return `
    <div class="stepper">
      ${steps.join('')}
    </div>
  `;
}


function openPayModal() {


    if (!payingOrder) {

        return;
    }


    const orderId =
        payingOrder.id;


    const total =
        Number(
            payingOrder.totalPrice
        ) || 0;


    $('#pay-order-info').textContent =
        `Order #${orderId} · ${formatMoney(total)} — choose how you would like to pay.`;
        
    const cashRadio =
        $('#pay-cash');


    if (cashRadio) {

        cashRadio.checked = true;
    }


    const overlay =
        $('#pay-overlay');


    if (!overlay) {

        return;
    }


    overlay.classList.remove(
        'hidden'
    );
    
    void overlay.offsetWidth;


    overlay.classList.add(
        'is-open'
    );
}

function closePayModal() {


    const overlay =
        $('#pay-overlay');


    if (!overlay) {

        return;
    }


    overlay.classList.remove(
        'is-open'
    );


    setTimeout(() => {

        overlay.classList.add(
            'hidden'
        );

    }, 260);


    payingOrder =
        null;
}
async function confirmPayment() {


    if (!payingOrder) {

        return;
    }
    
    const selectedMethod =
        document.querySelector(
            'input[name="pay-method"]:checked'
        );


    if (!selectedMethod) {

        showToast(
            'Please select a payment method.',
            'error'
        );

        return;
    }


    const method =
        selectedMethod.value;


    const button =
        $('#pay-confirm');


    if (!button) {

        return;
    }


    button.disabled =
        true;


    button.textContent =
        'Processing…';


    try {

        const payments =
            await PaymentAPI.list();


        const existingPayment =
            payments.find(
                (payment) => {

                    const paymentOrderId =
                        Number(
                            payment?.orderId ??
                            payment?.OrderId
                        );


                    return (
                        paymentOrderId ===
                        Number(payingOrder.id)
                    );
                }
            );


        const existingStatus =
            String(
                existingPayment?.status ??
                existingPayment?.Status ??
                ''
            )
                .trim()
                .toLowerCase();


        const alreadyPaid =
            existingStatus === 'paid' ||
            existingStatus === '1';


        if (alreadyPaid) {

            showToast(
                'This order has already been paid.',
                'error'
            );


            closePayModal();


            await loadOrders();


            return;
        }
        
        await PaymentAPI.pay(
            payingOrder.id,
            method
        );


        await finishPayment(
            method
        );


    } catch (firstError) {


        console.error(
            'FIRST PAYMENT ATTEMPT ERROR:',
            firstError
        );
        
        if (
            firstError.status === 404
        ) {

            try {

                const amount =
                    Number(
                        payingOrder.totalPrice
                    ) || 0;

                await PaymentAPI.create({

                    orderId:
                        Number(
                            payingOrder.id
                        ),

                    amount:
                        amount,

                    paymentMethod:
                        method
                });


                await PaymentAPI.pay(
                    payingOrder.id,
                    method
                );


                await finishPayment(
                    method
                );


            } catch (secondError) {


                console.error(
                    'SECOND PAYMENT ATTEMPT ERROR:',
                    secondError
                );


                showToast(
                    secondError.message ||
                    'Payment failed.',
                    'error'
                );


                resetPayButton();
            }


        } else {


            showToast(
                firstError.message ||
                'Payment failed.',
                'error'
            );


            resetPayButton();
        }
    }
}

async function finishPayment(
    method
) {


    showToast(
        `Paid ${method === 'Cash'
            ? 'in cash'
            : 'by card'} — thank you!`
    );


    closePayModal();


    resetPayButton();

    await loadOrders();
}
function resetPayButton() {


    const button =
        $('#pay-confirm');


    if (!button) {

        return;
    }


    button.disabled =
        false;


    button.textContent =
        'Confirm payment';
}
function isOrderPaid(payment) {


    const status =
        String(
            payment?.status ??
            payment?.Status ??
            ''
        )
            .trim()
            .toLowerCase();


    return (
        status === 'paid' ||
        status === '1'
    );
}


console.log(
    '✅ ORDERS PAGE PAYMENT UI READY'
);