const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    createPlanSchema,
    createSubscriptionSchema,
    updateSubscriptionSchema,
    createPaymentSchema,
    paymentOverviewQuery,
    subscriptionsListQuery,
    invoicesListQuery,
} = require('./payments.schema');

function paymentsRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    // Overview / Reports
    router.get('/overview', rbac('*'), controller.getOverview);
    router.get('/reports', rbac('*'), controller.getOverview);

    // Plans
    router.get('/plans', rbac('*'), controller.getPlans);
    router.post('/plans', rbac('*'), validate({ body: createPlanSchema }), controller.createPlan);

    // Subscriptions
    router.get('/subscriptions', rbac('*'), validate({ query: subscriptionsListQuery }), controller.getSubscriptions);
    router.post('/subscriptions', rbac('*'), validate({ body: createSubscriptionSchema }), controller.createSubscription);
    router.get('/subscriptions/:id', rbac('*'), validate({ params: uuidParam }), controller.getSubscription);
    router.put('/subscriptions/:id', rbac('*'), validate({ params: uuidParam, body: updateSubscriptionSchema }), controller.updateSubscription);

    // Invoices / Payments
    router.get('/invoices', rbac('*'), validate({ query: invoicesListQuery }), controller.getPayments);
    router.get('/invoices/:id', rbac('*'), validate({ params: uuidParam }), controller.getPayment);
    router.post('/pay', rbac('*'), validate({ body: createPaymentSchema }), controller.pay);

    return router;
}

module.exports = paymentsRoutes;
