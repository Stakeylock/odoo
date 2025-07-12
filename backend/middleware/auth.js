const jwt = require('jsonwebtoken');
// CORRECTED: Use object destructuring to get the supabase client
const { supabase } = require('../config/supabase'); 

// CRITICAL DEBUGGING CHECK: Ensure Supabase client is properly initialized
if (!supabase || typeof supabase.from !== 'function') {
    console.error('CRITICAL ERROR in middleware/auth.js: Supabase client is not properly initialized or exported in ../config/supabase.js.');
    console.error('Please verify the contents of ../config/supabase.js and ensure your .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY values.');
    // In a production environment, you might want to throw an error here to prevent the server from starting with a broken dependency:
    // throw new Error('Supabase client is unavailable in auth middleware. Check configuration.');
}

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
    console.log('--- authenticateToken middleware hit ---');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Received Authorization Header:', authHeader);
    console.log('Extracted Token:', token ? token.substring(0, 30) + '...' : 'No token'); // Log first 30 chars for brevity

    if (!token) {
        console.warn('Authentication failed: No access token provided.');
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        // Log the JWT secret being used for verification
        console.log('JWT_SECRET in authenticateToken:', process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED');
        if (!process.env.JWT_SECRET) {
            console.error('FATAL: JWT_SECRET is not defined in environment variables. Token verification will fail.');
            // This is a critical configuration error, should ideally be caught at app startup
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: JWT secret missing.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token successfully decoded:', decoded);

        // Verify user still exists in database
        console.log(`Verifying user existence for ID: ${decoded.userId}`);
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, role, is_active')
            .eq('id', decoded.userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no row found
            console.error('Supabase error during user verification in authenticateToken:', error.message);
            // This is a database error, not necessarily an invalid token
            return res.status(500).json({
                success: false,
                message: 'Database error during authentication.'
            });
        }

        if (!user || !user.is_active) {
            console.warn(`Authentication failed: User ID ${decoded.userId} not found or is inactive.`);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        console.log(`User ${user.username} (ID: ${user.id}) authenticated successfully. Role: ${user.role}`);
        next();
    } catch (error) {
        console.error('Authentication failed during token verification or user lookup.');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack); // Full stack trace for detailed debugging

        // Specific handling for JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ // Keep 403 for general invalid token
                success: false,
                message: 'Invalid token'
            });
        }
        // For any other unexpected errors during the process
        return res.status(500).json({
            success: false,
            message: 'Authentication failed due to server error.'
        });
    }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    console.log('--- requireAdmin middleware hit ---');
    if (!req.user) {
        console.warn('Admin check failed: req.user is undefined.');
        return res.status(401).json({
            success: false,
            message: 'Authentication required for admin access'
        });
    }
    if (req.user.role !== 'admin') {
        console.warn(`Admin check failed: User ${req.user.username} (ID: ${req.user.id}) is not an admin. Role: ${req.user.role}`);
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    console.log(`User ${req.user.username} (ID: ${req.user.id}) is an admin. Proceeding.`);
    next();
};

// Optional authentication - sets user if token provided
const optionalAuth = async (req, res, next) => {
    console.log('--- optionalAuth middleware hit ---');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        console.log('No token provided for optionalAuth. req.user set to null.');
        return next();
    }

    try {
        console.log('JWT_SECRET in optionalAuth:', process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED');
        if (!process.env.JWT_SECRET) {
            console.error('FATAL: JWT_SECRET is not defined in environment variables for optionalAuth.');
            req.user = null;
            return next(); // Allow to proceed, but without authenticated user
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token successfully decoded by optionalAuth.');

        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, role, is_active')
            .eq('id', decoded.userId)
            .single();

        if (!error && user && user.is_active) {
            req.user = user;
            console.log(`User ${user.username} (ID: ${user.id}) authenticated by optionalAuth.`);
        } else {
            req.user = null;
            console.warn(`User ID ${decoded.userId} not found or inactive, or Supabase error in optionalAuth. req.user set to null.`);
        }
    } catch (error) {
        req.user = null;
        console.warn('Token verification failed in optionalAuth. req.user set to null.');
        console.warn('Error in optionalAuth:', error.message);
    }

    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    optionalAuth
};
