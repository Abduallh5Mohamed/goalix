const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac, restrictTo } = require('../../middleware/rbac.middleware');
const schema = require('./custom-data.schema');

function customDataRoutes(controller, role) {
    const router = Router();
    router.use(authMiddleware, role === 'admin' ? rbac('access_admin_dashboard') : restrictTo(role));
    const manageSchema = role === 'admin'
        ? rbac('manage_academy_settings')
        : (_req, _res, next) => next();
    const managePlayerData = role === 'admin'
        ? rbac('manage_players')
        : (_req, _res, next) => next();

    router.get('/custom-categories', validate({ query: schema.listQuery }), controller.listCategories);
    router.post('/custom-categories', manageSchema, validate({ body: schema.categorySchema }), controller.createCategory);
    router.patch('/custom-categories/:categoryId', manageSchema, validate({ params: schema.categoryParam, body: schema.updateCategorySchema }), controller.updateCategory);
    router.delete('/custom-categories/:categoryId', manageSchema, validate({ params: schema.categoryParam }), controller.deleteCategory);

    router.post('/custom-categories/:categoryId/fields', manageSchema, validate({ params: schema.categoryParam, body: schema.fieldSchema }), controller.createField);
    router.patch('/custom-fields/:fieldId', manageSchema, validate({ params: schema.fieldParam, body: schema.updateFieldSchema }), controller.updateField);
    router.delete('/custom-fields/:fieldId', manageSchema, validate({ params: schema.fieldParam }), controller.deleteField);

    router.post('/custom-fields/:fieldId/options', manageSchema, validate({ params: schema.fieldParam, body: schema.optionSchema }), controller.createOption);
    router.patch('/custom-field-options/:optionId', manageSchema, validate({ params: schema.optionParam, body: schema.updateOptionSchema }), controller.updateOption);
    router.delete('/custom-field-options/:optionId', manageSchema, validate({ params: schema.optionParam }), controller.deleteOption);

    router.get('/players/:playerId/custom-profile', managePlayerData, validate({ params: schema.playerParam }), controller.getPlayerProfile);
    router.patch('/players/:playerId/custom-profile', managePlayerData, validate({ params: schema.playerParam, body: schema.valuesSchema }), controller.savePlayerValues);

    return router;
}

module.exports = customDataRoutes;
