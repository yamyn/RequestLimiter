const get = require('lodash.get');

class ReqLimitError extends Error {
    constructor() {
        super();
        this.name = 'RATE_LIMIT_EXCEEDED';
        this.message = 'Sorry, Due to high Requests, Limit is exceeded. Please, try again after some time.';
        this.statusCode = 403;
    }
}

const validate = (error) => get(error, 'errors[0].domain') === 'usageLimits';

module.exports = { ReqLimitError, validate }
