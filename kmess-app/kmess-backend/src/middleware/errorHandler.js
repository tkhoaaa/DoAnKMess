const errorHandler = (err, req, res, next) => {
    let error = {...err };
    error.message = err.message;

    // Log error for debugging
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);

    // Default error response
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';

    // MySQL/Database errors
    if (err.code) {
        switch (err.code) {
            case 'ER_DUP_ENTRY':
                statusCode = 400;
                message = 'Duplicate entry. Resource already exists.';
                break;
            case 'ER_NO_SUCH_TABLE':
                statusCode = 500;
                message = 'Database table not found.';
                break;
            case 'ER_ACCESS_DENIED_ERROR':
                statusCode = 500;
                message = 'Database access denied.';
                break;
            case 'ECONNREFUSED':
                statusCode = 500;
                message = 'Database connection refused.';
                break;
            default:
                statusCode = 500;
                message = 'Database error occurred.';
        }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token.';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired.';
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(error => error.message).join(', ');
    }

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File size too large. Maximum size is 10MB.';
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message = 'Unexpected field name in file upload.';
    }

    // Cast errors
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid resource ID format.';
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err
        })
    });
};

module.exports = errorHandler;