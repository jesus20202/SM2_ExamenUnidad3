import { Router } from 'express'
import { body, param } from 'express-validator'
import { AuthController } from '../controllers/AuthController'
import { handleInputErrors } from '../middleware/validation'
import { authenticate } from '../middleware/auth'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints relacionados con la autenticación y creación de cuentas
 */

/**
 * @swagger
 * /api/v1/auth/create-account:
 *   post:
 *     tags: [Authentication]
 *     summary: Crear una cuenta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               password_confirmation:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cuenta creada exitosamente
 *       400:
 *         description: Error de validación
 */

router.post('/create-account',
    body('name')
        .notEmpty().withMessage('No puede ir vacio'), 
    body('password')
        .isLength({min: 8}).withMessage('Password muy corto, minimo 8 caracteres'),
    body('password_confirmation').custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('Passwords no coinciden');
        }
        return true;
    }),
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    handleInputErrors,
    AuthController.createAccount
)

/**
 * @swagger
 * /api/v1/auth/confirm-account:
 *   post:
 *     tags: [Authentication]
 *     summary: Confirmar cuenta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cuenta confirmada exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/confirm-account',
    body('token')
       .notEmpty().withMessage('Token no puede ir vacio'),
    handleInputErrors,
    AuthController.confirmAccount
)

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *       400:
 *         description: Error de validación
 */
router.post('/login', 
    body('email')
       .isEmail().withMessage('E-mail no valido'),
    body('password')
       .notEmpty().withMessage('Password no puede ir vacio'),
    handleInputErrors,
    AuthController.login
)

/**
 * @swagger
 * /api/v1/auth/request-code:
 *   post:
 *     tags: [Authentication]
 *     summary: Solicitar código de confirmación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Código de confirmación enviado
 *       400:
 *         description: Error de validación
 */
router.post('/request-code', 
    body('email')
       .isEmail().withMessage('E-mail no valido'),
    handleInputErrors,
    AuthController.requestConfirmationCode
)

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Solicitar restablecimiento de contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Instrucciones para restablecimiento de contraseña enviadas
 *       400:
 *         description: Error de validación
 */
router.post('/forgot-password',  
    body('email')
       .isEmail().withMessage('E-mail no valido'),
    handleInputErrors,
    AuthController.forgotPassword
)

/**
 * @swagger
 * /api/v1/auth/validate-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Validar token de restablecimiento de contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token validado exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/validate-token',
    body('token')
       .notEmpty().withMessage('Token no puede ir vacio'),
    handleInputErrors,
    AuthController.validateToken
)

/**
 * @swagger
 * /api/v1/auth/update-password/{token}:
 *   post:
 *     tags: [Authentication]
 *     summary: Actualizar contraseña con token
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *               password_confirmation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/update-password/:token',
    param('token')
     .isNumeric().withMessage('Token no valido'),
    body('password')
        .isLength({min: 8}).withMessage('Password muy corto, minimo 8 caracteres'),
    body('password_confirmation').custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('Passwords no coinciden');
        }
        return true;
    }),
    handleInputErrors,
    AuthController.updatePasswordWithToken
)

/**
 * @swagger
 * /api/v1/auth/user:
 *   get:
 *     tags: [Authentication]
 *     summary: Obtener datos del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       401:
 *         description: No autorizado, falta token
 */
router.get('/user',
    authenticate,
    AuthController.user
)

export default router