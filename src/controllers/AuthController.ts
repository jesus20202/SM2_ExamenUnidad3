import type { Request, Response } from 'express';
import User from '../models/User';
import { checkPassword, hashPassword } from '../utils/auth';
import { generateToken } from '../utils/token';
import Token from '../models/Token';
import { AuthEmail } from '../emails/AuthEmail';
import logger from '../logs/logger';
import { generateJWT } from '../utils/jwt';
export class AuthController {

    static createAccount = async (req: Request, res: Response) => {
        try {
            const { password, email } = req.body;

            logger.info(`Attempting to create account for email: ${email}`);

            // Prevenir duplicados
            const userExists = await User.findOne({ email });
            if (userExists) {
                logger.warn(`User with email ${email} already exists`);
                const error = new Error('Usuario ya registrado');
                return res.status(409).json({ error: error.message });
            }

            // Crea el usuario
            const user = new User(req.body);
            user.password = await hashPassword(password);

            // Generar token
            const token = new Token();
            token.token = generateToken();
            console.log(token)
            token.user = user.id;

            // Enviar email de confirmación
            await AuthEmail.sendConfirmatioEmail({ 
                email: user.email,
                name: user.name,
                token: token.token 
            });

            await Promise.allSettled([user.save(), token.save()]);

            logger.info(`Account created successfully for email: ${email}`);
            res.send('Cuenta creada, revisa tu email');
        } catch (error) {
            logger.error('Error in createAccount:', error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    };

    static confirmAccount = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;

            logger.info(`Attempting to confirm account with token: ${token}`);

            const tokenExists = await Token.findOne({ token });
            if (!tokenExists) {
                logger.warn(`Invalid token provided: ${token}`);
                const error = new Error('Token no válido');
                return res.status(404).json({ error: error.message });
            }

            const user = await User.findById(tokenExists.user);
            user.confirmed = true;

            await Promise.allSettled([user.save(), tokenExists.deleteOne()]);

            logger.info(`Account confirmed successfully for user ID: ${user.id}`);
            res.send('Cuenta confirmada, ahora puedes iniciar sesión');
        } catch (error) {
            logger.error('Error in confirmAccount:', error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    };

    static login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            logger.info(`Attempting login for email: ${email}`);

            const user = await User.findOne({ email });
            if (!user) {
                logger.warn(`User not found for email: ${email}`);
                const error = new Error('Usuario no encontrado');
                return res.status(404).json({ error: error.message });
            }

            if (!user.confirmed) {
                const token = new Token();
                token.user = user.id;
                token.token = generateToken();
                await token.save();

                await AuthEmail.sendConfirmatioEmail({ 
                    email: user.email,
                    name: user.name,
                    token: token.token 
                });

                logger.warn(`Account not confirmed for email: ${email}. Sent confirmation email.`);
                const error = new Error('Cuenta sin ser confirmada, se envio otro email de confirmacion');
                return res.status(401).json({ error: error.message });
            }

            // Revisar password
            const isPasswordCorrect = await checkPassword(password, user.password);
            if (!isPasswordCorrect) {
                logger.warn(`Incorrect password for email: ${email}`);
                const error = new Error('Password incorrecto');
                return res.status(401).json({ error: error.message });
            }

            const token = generateJWT({id: user.id}) 

            logger.info(`User authenticated successfully for email: ${email}`);
            res.send(token);

        } catch (error) {
            logger.error('Error in login:', error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    };

    static requestConfirmationCode = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            logger.info(`Requesting confirmation code for email: ${email}`);

            const user = await User.findOne({ email });
            if (!user) {
                logger.warn(`User not found for email: ${email}`);
                const error = new Error('Usuario no esta registrado');
                return res.status(404).json({ error: error.message });
            }

            if (user.confirmed) {
                logger.warn(`User already confirmed for email: ${email}`);
                const error = new Error('Usuario ya confirmado');
                return res.status(403).json({ error: error.message });
            }

            const token = new Token();
            token.token = generateToken();
            console.log(token)
            token.user = user.id;

            await AuthEmail.sendConfirmatioEmail({ 
                email: user.email,
                name: user.name,
                token: token.token 
            });

            await Promise.allSettled([user.save(), token.save()]);

            logger.info(`New confirmation token sent to email: ${email}`);
            res.send('Se envio un nuevo token a tu e-mail');
        } catch (error) {
            logger.error('Error in requestConfirmationCode:', error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    };

    static forgotPassword = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            logger.info(`Requesting password reset for email: ${email}`);

            const user = await User.findOne({ email });
            if (!user) {
                logger.warn(`User not found for email: ${email}`);
                const error = new Error('Usuario no esta registrado');
                return res.status(404).json({ error: error.message });
            }

            const token = new Token();
            token.token = generateToken();
            console.log(token)
            token.user = user.id;
            await token.save();

            await AuthEmail.sendPasswordResetToken({ 
                email: user.email,
                name: user.name,
                token: token.token 
            });

            logger.info(`Password reset token sent to email: ${email}`);
            res.send('Revisa tu email');
        } catch (error) {
            logger.error('Error in forgotPassword:', error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    };

    static validateToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;

            logger.info(`Validating token: ${token}`);

            const tokenExists = await Token.findOne({ token });
            if (!tokenExists) {
                logger.warn(`Invalid token: ${token}`);
                const error = new Error('Token no válido');
                return res.status(404).json({ error: error.message });
            }

            logger.info(`Token validated successfully: ${token}`);
            res.send('Token valido, Define tu nuevo password');
        } catch (error) {
            logger.error('Error in validateToken:', error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    };

    static updatePasswordWithToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.params;
            const { password } = req.body;

            logger.info(`Updating password with token: ${token}`);

            const tokenExists = await Token.findOne({ token });
            if (!tokenExists) {
                logger.warn(`Invalid token for password update: ${token}`);
                const error = new Error('Token no válido');
                return res.status(404).json({ error: error.message });
            }

            const user = await User.findById(tokenExists.user);
            user.password = await hashPassword(password);

            await Promise.allSettled([user.save(), tokenExists.deleteOne()]);

            logger.info(`Password updated successfully for user ID: ${user.id}`);
            res.send('Password reestablecido correctamente');
        } catch (error) {
            logger.error('Error in updatePasswordWithToken:', error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    }

    static user = async (req: Request, res: Response) => {
        return res.json(req.user)
    }
}

export default AuthController;