class ReqLimitError extends Error {
    constructor() {
        super();
        this.name = 'RATE_LIMIT_EXCEEDED';
        this.message = 'Sorry, Due to high Requests, Limit is exceeded. Please, try again after some time.';
        this.statusCode = 403;
    }
}

const validate = (error) => error.code === 403;

module.exports = { ReqLimitError, validate }