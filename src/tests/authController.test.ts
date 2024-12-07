import { Request, Response } from 'express';
import { AuthController } from '../controllers/AuthController';
import User from '../models/User';
import Token from '../models/Token';
import { AuthEmail } from '../emails/AuthEmail';
import { generateToken } from '../utils/token';
import { hashPassword, checkPassword } from '../utils/auth';

// Mocking dependencias
jest.mock('../models/User');
jest.mock('../models/Token');
jest.mock('../emails/AuthEmail');
jest.mock('../utils/token');
jest.mock('../utils/auth');
jest.mock('../logs/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUser: any;
  let mockToken: any;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      save: jest.fn(),
    };
    mockToken = {
      token: 'testtoken123',
      user: 'user123',
      save: jest.fn(),
      deleteOne: jest.fn(),
    };
  });

  //======================================
  //Unit test para el método createAccount
  //======================================

  describe('createAccount', () => {

    // Unit test: Crear una nueva cuenta exitosamente

    it('should create a new account successfully', async () => {
      mockRequest.body = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User as any).mockImplementation(() => mockUser);
      (Token as any).mockImplementation(() => mockToken);
      (generateToken as jest.Mock).mockReturnValue('newtoken123');
      (hashPassword as jest.Mock).mockResolvedValue('hashedpassword');
      (AuthEmail.sendConfirmatioEmail as jest.Mock).mockResolvedValue(undefined);

      await AuthController.createAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.send).toHaveBeenCalledWith('Cuenta creada, revisa tu email');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(generateToken).toHaveBeenCalled();
      expect(AuthEmail.sendConfirmatioEmail).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockToken.save).toHaveBeenCalled();
    });

    // Unit test: Devolver un error si el usuario ya existe

    it('should return an error if user already exists', async () => {
      mockRequest.body = {
        email: 'existinguser@example.com',
        password: 'password123',
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await AuthController.createAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Usuario ya registrado' });
    });
  });

    // ====================================
    // Unit test para el método login
    // ====================================

  describe('login', () => {

    //Unit test: Iniciar sesion exitosamente

    it('should login successfully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'correctpassword',
      };
      
      mockUser.confirmed = true;
      mockUser.password = 'hashedpassword';
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (checkPassword as jest.Mock).mockResolvedValue(true);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.send).toHaveBeenCalledWith('Autenticado.................');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(checkPassword).toHaveBeenCalledWith('correctpassword', 'hashedpassword');
    });

    //Unit test: Devolver un erro si el usuario no se encuentra

    it('should return an error if user is not found', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });

    //Unit test: Enviar un email de confirmacion si la cuenta no esta confirmada

    it('should send confirmation email if user is not confirmed', async () => {
      mockRequest.body = {
        email: 'unconfirmed@example.com',
        password: 'password123',
      };
      
      mockUser.confirmed = false;
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Token as any).mockImplementation(() => mockToken);
      (generateToken as jest.Mock).mockReturnValue('newtoken123');
      (AuthEmail.sendConfirmatioEmail as jest.Mock).mockResolvedValue(undefined);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Cuenta sin ser confirmada, se envio otro email de confirmacion' });
      expect(Token).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalled();
      expect(AuthEmail.sendConfirmatioEmail).toHaveBeenCalled();
    });

    //Unit test: Devolver un error si la contraseña es incorrecta

    it('should return an error if password is incorrect', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      
      mockUser.confirmed = true;
      mockUser.password = 'hashedpassword';
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (checkPassword as jest.Mock).mockResolvedValue(false);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Password incorrecto' });
    });
  });

  // ====================================
  // Unit test para el método confirmAccount
  // ====================================

  describe('confirmAccount', () => {

    //Unit test: Confirmar la cuenta exitosamente 

    it('should confirm account successfully', async () => {
      mockRequest.body = { token: 'validtoken123' };
      mockUser.confirmed = false;
      
      (Token.findOne as jest.Mock).mockResolvedValue(mockToken);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await AuthController.confirmAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.send).toHaveBeenCalledWith('Cuenta confirmada, ahora puedes iniciar sesión');
      expect(Token.findOne).toHaveBeenCalledWith({ token: 'validtoken123' });
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockToken.deleteOne).toHaveBeenCalled();
    });

    //Unit test: Devolver un error si el token es inválido

    it('should return an error if token is invalid', async () => {
      mockRequest.body = { token: 'invalidtoken123' };
      
      (Token.findOne as jest.Mock).mockResolvedValue(null);

      await AuthController.confirmAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token no válido' });
    });
  });

  // ==============================================
  // Unit test para el método requestConfirmationCode
  // ==============================================

  describe('requestConfirmationCode', () => {

    // Unit test: Enviar un nuevo código de confirmación exitosamente

    it('should send a new confirmation code successfully', async () => {
      mockRequest.body = { email: 'unconfirmed@example.com' };
      mockUser.confirmed = false;
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Token as any).mockImplementation(() => mockToken);
      (generateToken as jest.Mock).mockReturnValue('newtoken123');
      (AuthEmail.sendConfirmatioEmail as jest.Mock).mockResolvedValue(undefined);

      await AuthController.requestConfirmationCode(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.send).toHaveBeenCalledWith('Se envio un nuevo token a tu e-mail');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'unconfirmed@example.com' });
      expect(generateToken).toHaveBeenCalled();
      expect(AuthEmail.sendConfirmatioEmail).toHaveBeenCalled();
      expect(mockToken.save).toHaveBeenCalled();
    });

    // Unit test: Devolver un error si el usuario no se encuentra

    it('should return an error if user is not found', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' };
      
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await AuthController.requestConfirmationCode(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Usuario no esta registrado' });
    });

    // Unit test: Devolver un error si el usuario ya está confirmado

    it('should return an error if user is already confirmed', async () => {
      mockRequest.body = { email: 'confirmed@example.com' };
      mockUser.confirmed = true;
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await AuthController.requestConfirmationCode(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Usuario ya confirmado' });
    });
  });

  // =====================================
  // Unit test para el método forgotPassword
  // =====================================

  describe('forgotPassword', () => {

    // Unit test: Enviar token de restablecimiento de contraseña exitosamente

    it('should send password reset token successfully', async () => {
      mockRequest.body = { email: 'forgetful@example.com' };
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Token as any).mockImplementation(() => mockToken);
      (generateToken as jest.Mock).mockReturnValue('resettoken123');
      (AuthEmail.sendPasswordResetToken as jest.Mock).mockResolvedValue(undefined);

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.send).toHaveBeenCalledWith('Revisa tu email');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'forgetful@example.com' });
      expect(generateToken).toHaveBeenCalled();
      expect(AuthEmail.sendPasswordResetToken).toHaveBeenCalled();
      expect(mockToken.save).toHaveBeenCalled();
    });

    // Unit test: Devolver un error si el usuario no se encuentra

    it('should return an error if user is not found', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' };
      
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Usuario no esta registrado' });
    });
  });

    // ====================================
    // Unit test para el método validateToken
    // ====================================

  describe('validateToken', () => {

    // Unit test: Validar token exitosamente

    it('should validate token successfully', async () => {
      mockRequest.body = { token: 'validtoken123' };
      
      (Token.findOne as jest.Mock).mockResolvedValue(mockToken);

      await AuthController.validateToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.send).toHaveBeenCalledWith('Token valido, Define tu nuevo password');
      expect(Token.findOne).toHaveBeenCalledWith({ token: 'validtoken123' });
    });

    // Unit test: Devolver un error si el token es inválido

    it('should return an error if token is invalid', async () => {
      mockRequest.body = { token: 'invalidtoken123' };
      
      (Token.findOne as jest.Mock).mockResolvedValue(null);

      await AuthController.validateToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token no válido' });
    });
  });

  // ====================================
  // Unit test para el método updatePasswordWithToken
  // ====================================

  describe('updatePasswordWithToken', () => {

    // Unit test: Actualizar contraseña exitosamente

    it('should update password successfully', async () => {
      mockRequest.params = { token: 'validtoken123' };
      mockRequest.body = { password: 'newpassword123' };
      
      (Token.findOne as jest.Mock).mockResolvedValue(mockToken);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('newhashpassword');

      await AuthController.updatePasswordWithToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.send).toHaveBeenCalledWith('Password reestablecido correctamente');
      expect(Token.findOne).toHaveBeenCalledWith({ token: 'validtoken123' });
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockToken.deleteOne).toHaveBeenCalled();
    });

    // Unit test: Devolver un error si el token es inválido

    it('should return an error if token is invalid', async () => {
      mockRequest.params = { token: 'invalidtoken123' };
      mockRequest.body = { password: 'newpassword123' };
      
      (Token.findOne as jest.Mock).mockResolvedValue(null);

      await AuthController.updatePasswordWithToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token no válido' });
    });
  });
});