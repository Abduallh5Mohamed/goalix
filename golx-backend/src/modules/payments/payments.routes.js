const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac, rbacAny } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    createPlanSchema,
    createSubscriptionSchema,
    updateSubscriptionSchema,
    createPaymentSchema,
    subscriptionsListQuery,
    invoicesListQuery,
} = require('./payments.schema');

function paymentsRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    // Overview / Reports
    const academyPaymentRead = rbacAny(
        'view_financial_reports',
        'manage_payments',
        'manage_subscriptions',
        'payment.read.academy',
    );

    router.get('/overview', academyPaymentRead, controller.getOverview);
    router.get('/reports', academyPaymentRead, controller.getOverview);

    // Plans
    router.get('/plans', academyPaymentRead, controller.getPlans);
    router.post('/plans', rbac('manage_subscriptions'), validate({ body: createPlanSchema }), controller.createPlan);

    // Subscriptions
    router.get('/subscriptions', academyPaymentRead, validate({ query: subscriptionsListQuery }), controller.getSubscriptions);
    router.post('/subscriptions', rbac('manage_subscriptions'), validate({ body: createSubscriptionSchema }), controller.createSubscription);
    router.get('/subscriptions/:id', academyPaymentRead, validate({ params: uuidParam }), controller.getSubscription);
    router.put('/subscriptions/:id', rbac('manage_subscriptions'), validate({ params: uuidParam, body: updateSubscriptionSchema }), controller.updateSubscription);

    // Invoices / Payments
    router.get('/invoices', academyPaymentRead, validate({ query: invoicesListQuery }), controller.getPayments);
    router.get('/invoices/:id', academyPaymentRead, validate({ params: uuidParam }), controller.getPayment);
    router.post('/pay', rbac('manage_payments'), validate({ body: createPaymentSchema }), controller.pay);

    return router;
}

module.exports = paymentsRoutes;
