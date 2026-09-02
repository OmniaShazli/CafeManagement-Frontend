class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

function defaultErrorMessage(status) {

    switch (status) {

        case 400:
            return 'The request was rejected. Please review your input.';

        case 401:
            return 'Your session has expired. Please sign in again.';

        case 403:
            return 'You do not have permission to perform this action.';

        case 404:
            return 'The requested resource was not found.';

        case 500:
            return 'Something went wrong on the server. Please try again.';

        default:
            return 'Unexpected error. Please try again.';
    }
}

function flattenValidationErrors(errors) {

    if (
        !errors ||
        typeof errors !== 'object'
    ) {
        return null;
    }

    const lines = [];

    Object.values(errors).forEach((list) => {

        if (Array.isArray(list)) {
            lines.push(...list);
        }

    });

    return lines.length
        ? lines.join(' ')
        : null;
}

async function apiRequest(
    path,
    {
        method = 'GET',
        body,
        auth = true
    } = {}
) {

    const headers = {
        Accept: 'application/json'
    };


    if (
        body !== undefined &&
        body !== null
    ) {

        headers['Content-Type'] =
            'application/json';
    }


    if (auth) {

        const token =
            getToken();

        console.log(
            'TOKEN USED BY API:',
            token
        );

        if (token) {

            headers['Authorization'] =
                `Bearer ${token}`;
        }
    }


    console.log(
        'REQUEST HEADERS:',
        headers
    );


    let response;


    try {

        response =
            await fetch(
                `${API_BASE_URL}${path}`,
                {
                    method,
                    headers,
                    body:
                        body !== undefined &&
                            body !== null
                            ? JSON.stringify(body)
                            : undefined
                }
            );

    } catch {

        throw new ApiError(
            'Cannot reach the Coffee House API. Make sure the backend is running on ' +
            API_BASE_URL,
            0
        );
    }


    let data = null;


    try {

        const text =
            await response.text();

        data =
            text
                ? JSON.parse(text)
                : null;

    } catch {

        data = null;
    }


    if (!response.ok) {

        const serverMessage =
            (data && data.message) ||
            (data && data.title) ||
            (
                data &&
                flattenValidationErrors(
                    data.errors
                )
            ) ||
            defaultErrorMessage(
                response.status
            );


        if (
            response.status === 401 &&
            auth &&
            !path.startsWith('/Auth/')
        ) {

            localStorage.removeItem(
                AUTH_STORAGE_KEY
            );
        }


        throw new ApiError(
            serverMessage,
            response.status,
            data
                ? data.errors
                : null
        );
    }


    return data;
}

const AuthAPI = {

    register: (payload) =>
        apiRequest(
            '/Auth/register',
            {
                method: 'POST',
                body: payload,
                auth: false
            }
        ),


    login: (payload) =>
        apiRequest(
            '/Auth/login',
            {
                method: 'POST',
                body: payload,
                auth: false
            }
        )
};

const CategoryAPI = {

    list: () =>
        apiRequest('/Category'),


    get: (id) =>
        apiRequest(
            `/Category/${id}`
        ),


    create: (dto) =>
        apiRequest(
            '/Category',
            {
                method: 'POST',
                body: dto
            }
        ),


    update: (dto) =>
        apiRequest(
            '/Category',
            {
                method: 'PUT',
                body: dto
            }
        ),


    remove: (id) =>
        apiRequest(
            `/Category/${id}`,
            {
                method: 'DELETE'
            }
        )
};

const MenuItemAPI = {

    list: () =>
        apiRequest('/MenuItem'),


    get: (id) =>
        apiRequest(
            `/MenuItem/${id}`
        ),


    create: (dto) =>
        apiRequest(
            '/MenuItem',
            {
                method: 'POST',
                body: dto
            }
        ),


    update: (dto) =>
        apiRequest(
            '/MenuItem',
            {
                method: 'PUT',
                body: dto
            }
        ),


    remove: (id) =>
        apiRequest(
            `/MenuItem/${id}`,
            {
                method: 'DELETE'
            }
        )
};

const TableAPI = {

    list: () =>
        apiRequest('/Table'),


    get: (id) =>
        apiRequest(
            `/Table/${id}`
        ),


    create: (dto) =>
        apiRequest(
            '/Table',
            {
                method: 'POST',
                body: dto
            }
        ),


    update: (dto) =>
        apiRequest(
            '/Table',
            {
                method: 'PUT',
                body: dto
            }
        ),


    remove: (id) =>
        apiRequest(
            `/Table/${id}`,
            {
                method: 'DELETE'
            }
        )
};

const ReservationAPI = {

    list: () =>
        apiRequest('/Reservation'),


    get: (id) =>
        apiRequest(
            `/Reservation/${id}`
        ),

    create: (dto) => {

        const reservationDate =
            dto.reservationDate;


        if (
            typeof reservationDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(
                reservationDate
            )
        ) {

            throw new ApiError(
                'Invalid reservation date.',
                400
            );
        }


        const startTime =
            dto.startTime ||
            dto.reservationTime;


        if (
            typeof startTime !== 'string' ||
            !/^\d{2}:\d{2}(:\d{2})?$/.test(
                startTime
            )
        ) {

            throw new ApiError(
                'Invalid reservation time.',
                400
            );
        }


        const startParts =
            startTime
                .split(':')
                .map(Number);


        const startHour =
            startParts[0];

        const startMinute =
            startParts[1];

        const startTotalMinutes =
            startHour * 60 +
            startMinute;


        const endTotalMinutes =
            startTotalMinutes + 150;


        const endHour =
            Math.floor(
                endTotalMinutes / 60
            ) % 24;


        const endMinute =
            endTotalMinutes % 60;


        const endTime =
            `${String(endHour).padStart(2, '0')}:` +
            `${String(endMinute).padStart(2, '0')}:00`;


        const normalizedStartTime =
            `${String(startHour).padStart(2, '0')}:` +
            `${String(startMinute).padStart(2, '0')}:00`;

        const numberOfGuests =
            Number(
                dto.numberOfGuests ??
                dto.partySize
            );


        if (
            !Number.isInteger(numberOfGuests) ||
            numberOfGuests < 1 ||
            numberOfGuests > 10
        ) {

            throw new ApiError(
                'Number of guests must be between 1 and 10.',
                400
            );
        }
        
        const tableId =
            Number(dto.tableId);


        if (
            !Number.isInteger(tableId) ||
            tableId < 1
        ) {

            throw new ApiError(
                'Invalid table.',
                400
            );
        }

        const reservationDto = {

            reservationDate,

            startTime:
                normalizedStartTime,

            endTime,

            numberOfGuests,

            tableId
        };


        console.log(
            'FINAL RESERVATION BODY SENT TO API:',
            reservationDto
        );


        return apiRequest(
            '/Reservation',
            {
                method: 'POST',
                body: reservationDto
            }
        );
    },
    
    update: (dto) => {

        const statusMap = {

            Pending: 0,
            Confirmed: 1,
            Cancelled: 2,
            Completed: 3
        };


        let statusValue;


        if (
            typeof dto.status === 'number'
        ) {

            statusValue =
                dto.status;

        } else {

            const statusName =
                String(
                    dto.status ?? ''
                ).trim();


            statusValue =
                statusMap[statusName];
        }


        if (
            statusValue === undefined
        ) {

            throw new ApiError(
                'Invalid reservation status.',
                400
            );
        }

        let reservationDate =
            dto.reservationDate;


        if (
            reservationDate &&
            typeof reservationDate === 'object'
        ) {

            const year =
                Number(
                    reservationDate.year
                );

            const month =
                Number(
                    reservationDate.month
                );

            const day =
                Number(
                    reservationDate.day
                );


            if (
                year &&
                month &&
                day
            ) {

                reservationDate =
                    `${String(year).padStart(4, '0')}-` +
                    `${String(month).padStart(2, '0')}-` +
                    `${String(day).padStart(2, '0')}`;
            }
        }


        if (
            typeof reservationDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(
                reservationDate
            )
        ) {

            throw new ApiError(
                'Invalid reservation date.',
                400
            );
        }

        let startTime =
            dto.startTime ??
            dto.reservationTime;


        if (
            startTime &&
            typeof startTime === 'object'
        ) {

            const hour =
                Number(
                    startTime.hour
                );

            const minute =
                Number(
                    startTime.minute
                );


            startTime =
                `${String(hour).padStart(2, '0')}:` +
                `${String(minute).padStart(2, '0')}:00`;
        }


        if (
            typeof startTime !== 'string'
        ) {

            throw new ApiError(
                'Invalid reservation start time.',
                400
            );
        }


        const startParts =
            startTime
                .split(':')
                .map(Number);


        if (
            !Number.isInteger(startParts[0]) ||
            !Number.isInteger(startParts[1])
        ) {

            throw new ApiError(
                'Invalid reservation start time.',
                400
            );
        }


        const startHour =
            startParts[0];

        const startMinute =
            startParts[1];


        startTime =
            `${String(startHour).padStart(2, '0')}:` +
            `${String(startMinute).padStart(2, '0')}:00`;

        let endTime =
            dto.endTime;


        if (
            endTime &&
            typeof endTime === 'object'
        ) {

            const hour =
                Number(
                    endTime.hour
                );

            const minute =
                Number(
                    endTime.minute
                );


            endTime =
                `${String(hour).padStart(2, '0')}:` +
                `${String(minute).padStart(2, '0')}:00`;
        }


        if (
            typeof endTime !== 'string'
        ) {

            const startTotalMinutes =
                startHour * 60 +
                startMinute;


            const endTotalMinutes =
                startTotalMinutes + 150;


            const endHour =
                Math.floor(
                    endTotalMinutes / 60
                ) % 24;


            const endMinute =
                endTotalMinutes % 60;


            endTime =
                `${String(endHour).padStart(2, '0')}:` +
                `${String(endMinute).padStart(2, '0')}:00`;
        }

        const numberOfGuests =
            Number(
                dto.numberOfGuests ??
                dto.partySize
            );


        if (
            !Number.isInteger(numberOfGuests) ||
            numberOfGuests < 1 ||
            numberOfGuests > 10
        ) {

            throw new ApiError(
                'Number of guests must be between 1 and 10.',
                400
            );
        }
        
        const tableId =
            Number(dto.tableId);


        if (
            !Number.isInteger(tableId) ||
            tableId < 1
        ) {

            throw new ApiError(
                'Invalid table.',
                400
            );
        }

        const id =
            Number(dto.id);


        if (
            !Number.isInteger(id) ||
            id < 1
        ) {

            throw new ApiError(
                'Invalid reservation ID.',
                400
            );
        }

        const reservationDto = {

            id,

            reservationDate,

            startTime,

            endTime,

            numberOfGuests,

            tableId,

            status:
                statusValue
        };


        console.log(
            'FINAL RESERVATION UPDATE BODY:',
            JSON.stringify(
                reservationDto,
                null,
                2
            )
        );


        return apiRequest(
            '/Reservation',
            {
                method: 'PUT',
                body: reservationDto
            }
        );
    },

    remove: (id) =>
        apiRequest(
            `/Reservation/${id}`,
            {
                method: 'DELETE'
            }
        )
};
const OrderAPI = {

    TYPE: {

        TakeAway: 0,

        DineIn: 1
    },


    STATUS: {

        Pending: 0,
        Preparing: 1,
        Ready: 2,
        Completed: 3,
        Cancelled: 4
    },

    list: async () => {

        const response =
            await apiRequest('/Order');


        console.log(
            'ORDER API LIST RESPONSE:',
            response
        );


        if (Array.isArray(response)) {
            return response;
        }


        if (
            Array.isArray(
                response?.items
            )
        ) {

            return response.items;
        }


        if (
            Array.isArray(
                response?.data
            )
        ) {

            return response.data;
        }


        console.error(
            'Unexpected Orders API response:',
            response
        );


        return [];
    },
    
    get: (id) =>
        apiRequest(
            `/Order/${id}`
        ),

    create: (dto) => {

        console.log(
            'ORDER DTO RECEIVED FROM FRONTEND:',
            dto
        );

        const items =
            dto?.items ||
            dto?.orderItems ||
            [];


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            throw new ApiError(
                'Order must contain at least one item.',
                400
            );
        }

        const rawOrderType =
            dto?.orderType ??
            dto?.type ??
            dto?.orderKind ??
            '';


        const normalizedOrderType =
            String(rawOrderType)
                .trim()
                .toLowerCase();


        let orderType;

        if (
            normalizedOrderType === 'dinein' ||
            normalizedOrderType === 'dine in' ||
            normalizedOrderType === 'dine_in' ||
            normalizedOrderType === 'dine-in' ||
            normalizedOrderType === '1'
        ) {

            orderType =
                OrderAPI.TYPE.DineIn;
        }

        else if (
            normalizedOrderType === 'takeaway' ||
            normalizedOrderType === 'take away' ||
            normalizedOrderType === 'take_away' ||
            normalizedOrderType === 'take-away' ||
            normalizedOrderType === '0'
        ) {

            orderType =
                OrderAPI.TYPE.TakeAway;
        }

        const hasTable =
            dto?.tableId !== null &&
            dto?.tableId !== undefined &&
            Number(dto.tableId) > 0;


        if (
            orderType === undefined &&
            hasTable
        ) {

            orderType =
                OrderAPI.TYPE.DineIn;
        }


        if (
            orderType === undefined
        ) {

            orderType =
                OrderAPI.TYPE.TakeAway;
        }

        const normalizedItems =
            items.map((item) => {

                const menuItemId =
                    Number(
                        item?.menuItemId
                    );


                const quantity =
                    Number(
                        item?.quantity
                    );


                if (
                    !Number.isInteger(
                        menuItemId
                    ) ||
                    menuItemId < 1
                ) {

                    throw new ApiError(
                        'Invalid menu item.',
                        400
                    );
                }


                if (
                    !Number.isInteger(
                        quantity
                    ) ||
                    quantity < 1 ||
                    quantity > 100
                ) {

                    throw new ApiError(
                        'Item quantity must be between 1 and 100.',
                        400
                    );
                }


                return {

                    menuItemId,

                    quantity
                };

            });

        const orderDto = {

            items:
                normalizedItems,

            orderType:
                orderType
        };

        if (
            orderType ===
            OrderAPI.TYPE.DineIn
        ) {

            const tableId =
                Number(
                    dto?.tableId
                );


            if (
                !Number.isInteger(tableId) ||
                tableId < 1
            ) {

                throw new ApiError(
                    'A valid table is required for a DineIn order.',
                    400
                );
            }


            orderDto.tableId =
                tableId;
        }

        console.log(
            'FINAL ORDER TYPE NUMBER:',
            orderType
        );


        console.log(
            'FINAL ORDER TYPE NAME:',
            orderType === OrderAPI.TYPE.DineIn
                ? 'DineIn'
                : 'TakeAway'
        );


        console.log(
            'FINAL TABLE ID:',
            orderDto.tableId ?? null
        );


        console.log(
            'FINAL ORDER BODY SENT TO API:',
            JSON.stringify(
                orderDto,
                null,
                2
            )
        );


        return apiRequest(
            '/Order',
            {
                method: 'POST',
                body: orderDto
            }
        );
    },

    updateStatus: (dto) => {

        console.log(
            'ORDER STATUS UPDATE DTO RECEIVED:',
            dto
        );


        const id =
            Number(
                dto?.id ??
                dto?.orderId ??
                dto?.Id ??
                dto?.OrderId
            );


        if (
            !Number.isInteger(id) ||
            id < 1
        ) {

            throw new ApiError(
                'Invalid order ID.',
                400
            );
        }


        let statusValue =
            dto?.status ??
            dto?.Status;


        if (
            typeof statusValue === 'string' &&
            /^\d+$/.test(
                statusValue.trim()
            )
        ) {

            statusValue =
                Number(
                    statusValue
                );
        }


        if (
            typeof statusValue === 'string'
        ) {

            const normalizedStatusMap = {

                pending: 0,
                preparing: 1,
                ready: 2,
                completed: 3,
                cancelled: 4,
                canceled: 4
            };


            statusValue =
                normalizedStatusMap[
                statusValue
                    .trim()
                    .toLowerCase()
                ];
        }


        if (
            !Number.isInteger(
                statusValue
            ) ||
            statusValue < 0 ||
            statusValue > 4
        ) {

            throw new ApiError(
                'Invalid order status. Allowed values are Pending, Preparing, Ready, Completed, or Cancelled.',
                400
            );
        }


        const statusDto = {

            id,

            status:
                statusValue
        };


        console.log(
            'FINAL ORDER STATUS DTO:',
            JSON.stringify(
                statusDto,
                null,
                2
            )
        );


        return apiRequest(
            '/Order/status',
            {
                method: 'PUT',
                body: statusDto
            }
        );
    }
};

const PaymentAPI = {
    
    METHOD: {

        Cash: 0,

        Card: 1
    },

    list: async () => {

        const response =
            await apiRequest(
                '/Payment'
            );


        console.log(
            'PAYMENT API LIST RESPONSE:',
            response
        );


        if (
            Array.isArray(response)
        ) {

            return response;
        }


        if (
            Array.isArray(
                response?.items
            )
        ) {

            return response.items;
        }


        if (
            Array.isArray(
                response?.data
            )
        ) {

            return response.data;
        }


        console.error(
            'Unexpected Payment API response:',
            response
        );


        return [];
    },

    get: (paymentId) => {

        const id =
            Number(paymentId);


        if (
            !Number.isInteger(id) ||
            id < 1
        ) {

            throw new ApiError(
                'Invalid payment ID.',
                400
            );
        }


        return apiRequest(
            `/Payment/${id}`
        );
    },

    create: (dto) => {

        const orderId =
            Number(
                dto?.orderId
            );


        const amount =
            Number(
                dto?.amount
            );


        let paymentMethod =
            dto?.paymentMethod ??
            dto?.method;

        if (
            typeof paymentMethod === 'string'
        ) {

            const methodName =
                paymentMethod
                    .trim()
                    .toLowerCase();


            if (
                methodName === 'cash'
            ) {

                paymentMethod =
                    PaymentAPI.METHOD.Cash;
            }


            else if (
                methodName === 'card'
            ) {

                paymentMethod =
                    PaymentAPI.METHOD.Card;
            }


            else if (
                /^\d+$/.test(
                    methodName
                )
            ) {

                paymentMethod =
                    Number(
                        methodName
                    );
            }


            else {

                throw new ApiError(
                    'Invalid payment method. Use Cash or Card.',
                    400
                );
            }
        }


        paymentMethod =
            Number(
                paymentMethod
            );

        if (
            !Number.isInteger(orderId) ||
            orderId < 1
        ) {

            throw new ApiError(
                'Invalid order ID.',
                400
            );
        }


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw new ApiError(
                'Invalid payment amount.',
                400
            );
        }


        if (
            paymentMethod !==
            PaymentAPI.METHOD.Cash &&
            paymentMethod !==
            PaymentAPI.METHOD.Card
        ) {

            throw new ApiError(
                'Invalid payment method. Use Cash or Card.',
                400
            );
        }

        const paymentDto = {

            orderId,

            amount,

            paymentMethod
        };


        console.log(
            'FINAL PAYMENT CREATE BODY:',
            JSON.stringify(
                paymentDto,
                null,
                2
            )
        );


        return apiRequest(
            '/Payment',
            {
                method: 'POST',
                body: paymentDto
            }
        );
    },

    pay: async (
        orderId,
        paymentMethod =
            PaymentAPI.METHOD.Cash
    ) => {

        const id =
            Number(orderId);


        /* ----------------------------------------------------
           VALIDATE ORDER ID
        ---------------------------------------------------- */

        if (
            !Number.isInteger(id) ||
            id < 1
        ) {

            throw new ApiError(
                'Invalid order ID.',
                400
            );
        }

        if (
            typeof paymentMethod === 'string'
        ) {

            const methodName =
                paymentMethod
                    .trim()
                    .toLowerCase();


            if (
                methodName === 'cash'
            ) {

                paymentMethod =
                    PaymentAPI.METHOD.Cash;
            }


            else if (
                methodName === 'card'
            ) {

                paymentMethod =
                    PaymentAPI.METHOD.Card;
            }


            else if (
                /^\d+$/.test(
                    methodName
                )
            ) {

                paymentMethod =
                    Number(
                        methodName
                    );
            }


            else {

                throw new ApiError(
                    'Invalid payment method. Use Cash or Card.',
                    400
                );
            }
        }


        paymentMethod =
            Number(
                paymentMethod
            );


        if (
            paymentMethod !==
            PaymentAPI.METHOD.Cash &&
            paymentMethod !==
            PaymentAPI.METHOD.Card
        ) {

            throw new ApiError(
                'Invalid payment method. Use Cash or Card.',
                400
            );
        }


        console.log(
            '===================================='
        );


        console.log(
            'START PAYMENT PROCESS'
        );


        console.log(
            'ORDER ID:',
            id
        );


        console.log(
            'PAYMENT METHOD:',
            paymentMethod === 0
                ? 'Cash'
                : 'Card'
        );

        const payments =
            await PaymentAPI.list();


        console.log(
            'ALL PAYMENTS:',
            payments
        );

        let existingPayment =
            payments.find(
                (payment) => {

                    const paymentOrderId =
                        Number(
                            payment?.orderId ??
                            payment?.OrderId
                        );


                    return (
                        paymentOrderId === id
                    );
                }
            );


        console.log(
            'PAYMENT FOUND FOR ORDER:',
            existingPayment
        );

        if (
            !existingPayment
        ) {

            console.log(
                'NO PAYMENT FOUND.'
            );


            console.log(
                'GETTING ORDER...'
            );


            const order =
                await OrderAPI.get(id);


            console.log(
                'ORDER USED FOR PAYMENT:',
                order
            );


            const totalPrice =
                Number(
                    order?.totalPrice ??
                    order?.TotalPrice ??
                    order?.total ??
                    order?.amount
                );


            if (
                !Number.isFinite(
                    totalPrice
                ) ||
                totalPrice <= 0
            ) {

                throw new ApiError(
                    'Cannot create payment because the order total price is invalid.',
                    400
                );
            }


            existingPayment =
                await PaymentAPI.create({

                    orderId:
                        id,

                    amount:
                        totalPrice,

                    paymentMethod:
                        paymentMethod
                });


            console.log(
                'PAYMENT CREATED SUCCESSFULLY:',
                existingPayment
            );
        }

        const existingStatus =
            String(
                existingPayment?.status ??
                existingPayment?.Status ??
                ''
            )
                .trim()
                .toLowerCase();


        console.log(
            'CURRENT PAYMENT STATUS:',
            existingStatus
        );

        if (
            existingStatus === 'paid' ||
            existingStatus === '1'
        ) {

            console.log(
                'PAYMENT IS ALREADY PAID.'
            );


            return existingPayment;
        }

        console.log(
            'CALLING PAYMENT ENDPOINT:',
            `/Payment/${id}/pay`
        );


        const result =
            await apiRequest(
                `/Payment/${id}/pay`,
                {
                    method: 'PUT'
                }
            );


        console.log(
            'PAYMENT COMPLETED SUCCESSFULLY:',
            result
        );


        console.log(
            '===================================='
        );


        return result;
    }
};

window.ApiError =
    ApiError;

window.apiRequest =
    apiRequest;

window.AuthAPI =
    AuthAPI;

window.CategoryAPI =
    CategoryAPI;

window.MenuItemAPI =
    MenuItemAPI;

window.TableAPI =
    TableAPI;

window.ReservationAPI =
    ReservationAPI;

window.OrderAPI =
    OrderAPI;

window.PaymentAPI =
    PaymentAPI;


console.log(
    'API LAYER LOADED SUCCESSFULLY'
);

console.log(
    'Available APIs:',
    {
        AuthAPI: !!window.AuthAPI,
        CategoryAPI: !!window.CategoryAPI,
        MenuItemAPI: !!window.MenuItemAPI,
        TableAPI: !!window.TableAPI,
        ReservationAPI: !!window.ReservationAPI,
        OrderAPI: !!window.OrderAPI,
        PaymentAPI: !!window.PaymentAPI
    }
);