const crypto = require('node:crypto');
const ApiResponse = require('../../shared/api-response');

class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    register = async (req, res, next) => {
        try {
            const result = await this.authService.register(req.body);

            // Set refresh token in httpOnly cookie
            this._setRefreshCookie(res, result.refreshToken);

            res.status(201).json(ApiResponse.success({
                user: result.user,
                accessToken: result.accessToken,
            }));
        } catch (err) {
            next(err);
        }
    };

    login = async (req, res, next) => {
        try {
            const ip = req.ip;
            const userAgent = req.get('user-agent');
            const result = await this.authService.login(req.body, ip, userAgent);

            this._setRefreshCookie(res, result.refreshToken);

            res.json(ApiResponse.success({
                user: result.user,
                accessToken: result.accessToken,
            }));
        } catch (err) {
            next(err);
        }
    };

    logout = async (req, res, next) => {
        try {
            const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
            let tokenHash = null;
            if (refreshToken) {
                tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            }

            await this.authService.logout(req.user.userId, tokenHash);

            res.clearCookie('refreshToken');
            res.json(ApiResponse.success({ message: 'Logged out successfully' }));
        } catch (err) {
            next(err);
        }
    };

    refresh = async (req, res, next) => {
        try {
            const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
            if (!refreshToken) {
                return res.status(401).json(
                    ApiResponse.error('UNAUTHORIZED', 'Refresh token required'),
                );
            }

            const result = await this.authService.refreshToken(refreshToken);

            this._setRefreshCookie(res, result.refreshToken);

            res.json(ApiResponse.success({
                user: result.user,
                accessToken: result.accessToken,
            }));
        } catch (err) {
            next(err);
        }
    };

    forgotPassword = async (req, res, next) => {
        try {
            const result = await this.authService.forgotPassword(req.body.email);
            res.json(ApiResponse.success(result));
        } catch (err) {
            next(err);
        }
    };

    resetPassword = async (req, res, next) => {
        try {
            const result = await this.authService.resetPassword(req.body.token, req.body.password);
            res.json(ApiResponse.success(result));
        } catch (err) {
            next(err);
        }
    };

    me = async (req, res, next) => {
        try {
            const user = await this.authService.repo.findById(req.user.userId);
            if (!user) {
                return res.status(404).json(ApiResponse.error('RESOURCE_NOT_FOUND', 'User not found'));
            }
            res.json(ApiResponse.success(this.authService._sanitizeUser(user)));
        } catch (err) {
            next(err);
        }
    };

    _setRefreshCookie(res, token) {
        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/v1/auth',
        });
    }
}

module.exports = AuthController;
