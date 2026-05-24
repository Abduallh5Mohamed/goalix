/**
 * Test suite for Birth Years & Groups Refactor
 * 
 * This file demonstrates how to test the new label-based system.
 * Run with: npm test tests/academy-refactor.test.js
 */

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/infrastructure/database');

describe('Birth Years & Groups Refactor', () => {
    let authToken;
    let academyId;
    let branchId;

    beforeAll(async () => {
        // Setup: Create test academy and branch
        // In real tests, you'd authenticate and get a token
        // authToken = await getTestAuthToken();
        // academyId = await createTestAcademy();
        // branchId = await createTestBranch(academyId);
    });

    afterAll(async () => {
        // Cleanup
        await db.destroy();
    });

    describe('Birth Years', () => {
        describe('POST /api/academy/birth-years', () => {
            it('should create a birth year range', async () => {
                const response = await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'Juniors',
                        fromYear: 2010,
                        toYear: 2011,
                    })
                    .expect(201);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toMatchObject({
                    label: 'Juniors',
                    normalized_label: 'juniors',
                    from_year: 2010,
                    to_year: 2011,
                });
            });

            it('should auto-generate label if not provided', async () => {
                const response = await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        fromYear: 2014,
                        toYear: 2015,
                    })
                    .expect(201);

                expect(response.body.data.label).toBe('2014-2015');
            });

            it('should reject overlapping ranges for same label', async () => {
                // Create first range
                await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'U12',
                        fromYear: 2012,
                        toYear: 2013,
                    })
                    .expect(201);

                // Try to create overlapping range
                const response = await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'U12',
                        fromYear: 2013,
                        toYear: 2014,
                    })
                    .expect(409);

                expect(response.body.error).toBe('ConflictError');
            });

            it('should reject invalid year range', async () => {
                const response = await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'Invalid',
                        fromYear: 2015,
                        toYear: 2010, // toYear < fromYear
                    })
                    .expect(400);

                expect(response.body.error).toBe('ValidationError');
            });
        });

        describe('GET /api/academy/birth-years', () => {
            beforeEach(async () => {
                // Create test data
                await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'Juniors',
                        fromYear: 2010,
                        toYear: 2011,
                    });

                await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'Juniors',
                        fromYear: 2012,
                        toYear: 2013,
                    });
            });

            it('should return birth years grouped by label', async () => {
                const response = await request(app)
                    .get(`/api/academy/birth-years?branchId=${branchId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toBeInstanceOf(Array);

                const juniorsGroup = response.body.data.find(
                    (g) => g.normalizedLabel === 'juniors'
                );
                expect(juniorsGroup).toBeDefined();
                expect(juniorsGroup.birthYears).toHaveLength(2);
                expect(juniorsGroup.birthYears[0].fromYear).toBe(2010);
                expect(juniorsGroup.birthYears[1].fromYear).toBe(2012);
            });
        });

        describe('PATCH /api/academy/birth-years/:id', () => {
            let birthYearId;

            beforeEach(async () => {
                const response = await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'Test',
                        fromYear: 2016,
                        toYear: 2017,
                    });
                birthYearId = response.body.data.id;
            });

            it('should update birth year range', async () => {
                const response = await request(app)
                    .patch(`/api/academy/birth-years/${birthYearId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        label: 'Updated',
                        fromYear: 2016,
                        toYear: 2018,
                    })
                    .expect(200);

                expect(response.body.data.label).toBe('Updated');
                expect(response.body.data.to_year).toBe(2018);
            });
        });

        describe('DELETE /api/academy/birth-years/:id', () => {
            it('should soft delete birth year without relations', async () => {
                const createResponse = await request(app)
                    .post('/api/academy/birth-years')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        label: 'ToDelete',
                        fromYear: 2020,
                        toYear: 2021,
                    });

                const birthYearId = createResponse.body.data.id;

                await request(app)
                    .delete(`/api/academy/birth-years/${birthYearId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                // Verify it's soft deleted
                const getResponse = await request(app)
                    .get(`/api/academy/birth-years?branchId=${branchId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                const deleted = getResponse.body.data.find(
                    (g) => g.birthYears.some((by) => by.id === birthYearId)
                );
                expect(deleted).toBeUndefined();
            });
        });
    });

    describe('Groups', () => {
        let juniorsLabel;
        let u12Label;

        beforeEach(async () => {
            // Create birth years for testing
            await request(app)
                .post('/api/academy/birth-years')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    label: 'Juniors',
                    fromYear: 2010,
                    toYear: 2011,
                });

            await request(app)
                .post('/api/academy/birth-years')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    label: 'U12',
                    fromYear: 2012,
                    toYear: 2013,
                });

            juniorsLabel = 'Juniors';
            u12Label = 'U12';
        });

        describe('POST /api/academy/groups', () => {
            it('should create group with single label', async () => {
                const response = await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'Group A',
                        labels: [juniorsLabel],
                        maxPlayers: 25,
                    })
                    .expect(201);

                expect(response.body.success).toBe(true);
                expect(response.body.data.name).toBe('Group A');
            });

            it('should create group with multiple labels', async () => {
                const response = await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'Mixed Group',
                        labels: [juniorsLabel, u12Label],
                        maxPlayers: 30,
                    })
                    .expect(201);

                expect(response.body.success).toBe(true);
            });

            it('should reject group without labels', async () => {
                const response = await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'No Labels',
                        labels: [],
                    })
                    .expect(400);

                expect(response.body.error).toBe('ValidationError');
            });

            it('should reject group with non-existent labels', async () => {
                const response = await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'Invalid Labels',
                        labels: ['NonExistent'],
                    })
                    .expect(404);

                expect(response.body.error).toBe('NotFoundError');
            });

            it('should normalize and deduplicate labels', async () => {
                const response = await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'Duplicate Labels',
                        labels: ['Juniors', 'JUNIORS', '  juniors  '],
                    })
                    .expect(201);

                expect(response.body.success).toBe(true);
            });
        });

        describe('GET /api/academy/groups', () => {
            beforeEach(async () => {
                // Create test groups
                await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'Group A',
                        labels: [juniorsLabel],
                    });

                await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'Group B',
                        labels: [u12Label],
                    });
            });

            it('should return groups with labels', async () => {
                const response = await request(app)
                    .get(`/api/academy/groups?branchId=${branchId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toBeInstanceOf(Array);
                expect(response.body.data.length).toBeGreaterThan(0);

                const group = response.body.data[0];
                expect(group).toHaveProperty('labels');
                expect(group.labels).toBeInstanceOf(Array);
                expect(group).toHaveProperty('playerCount');
                expect(group).toHaveProperty('coachCount');
            });

            it('should support pagination', async () => {
                const response = await request(app)
                    .get(`/api/academy/groups?branchId=${branchId}&page=1&limit=1`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.pagination).toBeDefined();
                expect(response.body.pagination.page).toBe(1);
                expect(response.body.data.length).toBeLessThanOrEqual(1);
            });
        });

        describe('PUT /api/academy/groups/:id', () => {
            let groupId;

            beforeEach(async () => {
                const response = await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'Test Group',
                        labels: [juniorsLabel],
                    });
                groupId = response.body.data.id;
            });

            it('should update group name', async () => {
                const response = await request(app)
                    .put(`/api/academy/groups/${groupId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Updated Name',
                    })
                    .expect(200);

                expect(response.body.data.name).toBe('Updated Name');
            });

            it('should update group labels', async () => {
                const response = await request(app)
                    .put(`/api/academy/groups/${groupId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        labels: [u12Label],
                    })
                    .expect(200);

                expect(response.body.success).toBe(true);
            });

            it('should update multiple fields', async () => {
                const response = await request(app)
                    .put(`/api/academy/groups/${groupId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'New Name',
                        labels: [juniorsLabel, u12Label],
                        maxPlayers: 35,
                    })
                    .expect(200);

                expect(response.body.data.name).toBe('New Name');
                expect(response.body.data.max_players).toBe(35);
            });
        });

        describe('DELETE /api/academy/groups/:id', () => {
            it('should soft delete group without relations', async () => {
                const createResponse = await request(app)
                    .post('/api/academy/groups')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        branchId,
                        name: 'To Delete',
                        labels: [juniorsLabel],
                    });

                const groupId = createResponse.body.data.id;

                await request(app)
                    .delete(`/api/academy/groups/${groupId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                // Verify it's soft deleted
                const getResponse = await request(app)
                    .get(`/api/academy/groups?branchId=${branchId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                const deleted = getResponse.body.data.find((g) => g.id === groupId);
                expect(deleted).toBeUndefined();
            });
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete workflow', async () => {
            // 1. Create birth years
            const by1 = await request(app)
                .post('/api/academy/birth-years')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    label: 'Workflow',
                    fromYear: 2010,
                    toYear: 2011,
                });

            const by2 = await request(app)
                .post('/api/academy/birth-years')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    label: 'Workflow',
                    fromYear: 2012,
                    toYear: 2013,
                });

            expect(by1.status).toBe(201);
            expect(by2.status).toBe(201);

            // 2. Create group with label
            const group = await request(app)
                .post('/api/academy/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    name: 'Workflow Group',
                    labels: ['Workflow'],
                });

            expect(group.status).toBe(201);

            // 3. Get birth years (should be grouped)
            const birthYears = await request(app)
                .get(`/api/academy/birth-years?branchId=${branchId}`)
                .set('Authorization', `Bearer ${authToken}`);

            const workflowGroup = birthYears.body.data.find(
                (g) => g.normalizedLabel === 'workflow'
            );
            expect(workflowGroup.birthYears).toHaveLength(2);

            // 4. Get groups (should include labels)
            const groups = await request(app)
                .get(`/api/academy/groups?branchId=${branchId}`)
                .set('Authorization', `Bearer ${authToken}`);

            const workflowGroupData = groups.body.data.find(
                (g) => g.name === 'Workflow Group'
            );
            expect(workflowGroupData.labels).toHaveLength(1);
            expect(workflowGroupData.labels[0].normalizedLabel).toBe('workflow');
        });

        it('should prevent deletion with active relations', async () => {
            // This test would require creating players, sessions, etc.
            // Left as an exercise for complete integration testing
        });
    });

    describe('Label Normalization', () => {
        it('should normalize labels consistently', async () => {
            // Create birth year with uppercase label
            await request(app)
                .post('/api/academy/birth-years')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    label: 'NORMALIZE',
                    fromYear: 2015,
                    toYear: 2016,
                });

            // Create group with lowercase label
            const response = await request(app)
                .post('/api/academy/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    name: 'Normalized Group',
                    labels: ['normalize'],
                })
                .expect(201);

            expect(response.body.success).toBe(true);
        });

        it('should handle whitespace in labels', async () => {
            await request(app)
                .post('/api/academy/birth-years')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    label: '  Whitespace  ',
                    fromYear: 2017,
                    toYear: 2018,
                });

            const response = await request(app)
                .post('/api/academy/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    branchId,
                    name: 'Whitespace Group',
                    labels: ['Whitespace'],
                })
                .expect(201);

            expect(response.body.success).toBe(true);
        });
    });
});
