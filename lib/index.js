const { ReqLimitError, validate } = require('./ReqLimitBasicError');
const instances = {};

const defaultOptions = {
    maxAttempts: 42,
    maxRepeatAttempts: 6,
    checkDelay: 1200,
    maxOneTimeReq: 6,
    clientName: 'client',
    limitErrorValidator: validate,
    ReqLimitError,
};

const haveFreePort = Symbol('haveFreePort');
const toUsePort = Symbol('toUsePort');
const toFreePort = Symbol('toFreePort');
const checkPort = Symbol('checkPort');

/**
 * @description Simple Request limiter
 */
class ReqLimiter {
    /**
     *Creates an instance of ReqLimiter.
     * @param {defaultOptions} options
     * @memberof ReqLimiter
     */
    constructor(options) {
        this.portsStatus = {};
        this.clients = {};
        this.config = { ...defaultOptions, ...options };
    }

    /**
     *
     * @static
     * @param {string} instance ReqLimiter instance`s name
     * @param {defaultOptions} options ReqLimiter configuration options
     * @property {number}  options.maxAttempts   - 42.
     * @property {number}  options.maxRepeatAttempts   - 6.
     * @property {number}  options.checkDelay   - 1200 (ms).
     * @property {number}  options.maxOneTimeReq   - 6.
     * @property {string}  options.clientName        - 'client'.
     * @property {function}  options.limitErrorValidator     - validate, (error => error.code === 403).
     * @property {Error}  options.ReqLimitError - Error class or class emxtends Error.
     * @returns {ReqLimiter} instance of ReqLimiter
     * @memberof ReqLimiter
     */
    static getInstance(instance, options) {
        if (instances[instance]) {
            return instances[instance];
        }
        instances[instance] = new ReqLimiter(options);
        return instances[instance];
    }

    /**
     * @param {string} port name of the port you would like, of use
     * @returns {any} ReqLimiter.clients - A cache that can be stored in a property `clients`
     * @memberof ReqLimiter
     */
    haveConnect = (port) => {
        if (!this.portsStatus[port]) {
            this.portsStatus[port] = 0;
        }

        return this.clients[port];
    };

    /**
     * @param {string} port name of the port you would like, of use
     * @param {any} client cache that can be stored in a property `clients`
     * @memberof ReqLimiter
     */
    setClient = (port, client) => {
        this.clients[port] = client;
    };

    [haveFreePort] = (port) => this.portsStatus[port] < this.config.maxOneTimeReq;
    [toUsePort] = (port) => (this.portsStatus[port] += 1);
    [toFreePort] = (port) => (this.portsStatus[port] -= 1);

    /**
     * @async
     * @param {string} port name of the port you would like, of use
     * @param {function} cb callback function, that need add to port que
     * @param {object} args arguments for callback function
     * @param {number} attempts The number of attempts that have already been made, default 0
     * @memberof ReqLimiter
     */
    reqWithCheck = async (port, cb, args, attempts) => {
        try {
            attempts = attempts || 0;

            await this[checkPort](attempts, port);

            const result = await cb({
                ...args,
                [this.config.clientName]: this.clients[port],
            });
            this[toFreePort](port);

            return result;
        } catch (error) {
            if (this.config.limitErrorValidator(error)) {
                const reapetAttempts = this.config.maxAttempts - this.config.maxRepeatAttempts;

                const result = await this.reqWithCheck(port, cb, args, reapetAttempts);

                return result;
            }

            throw error;
        }
    };

    [checkPort] = async (attempts, port) => {
        return new Promise((resolve, reject) => {
            if (this[haveFreePort](port)) {
                this[toUsePort](port);

                return resolve();
            }

            if (attempts >= this.config.maxAttempts) {
                return reject(new this.config.ReqLimitError());
            }
            setTimeout(async () => {
                try {
                    attempts += 1;
                    await this[checkPort](attempts, port);

                    return resolve();
                } catch (error) {
                    reject(error);
                }
            }, this.config.checkDelay);
        });
    };
}

module.exports = ReqLimiter;
