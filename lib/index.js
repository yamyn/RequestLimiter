const NodeCache = require('node-cache');

const { ReqLimitError, validate } = require('./ReqLimitBasicError');
const instances = {};

const defaultOptions = {
    maxAttempts: 42,
    maxRepeatAttempts: 6,
    checkDelay: 1200,
    maxOneTimeReq: 6,
    stdTTL: 10800,
    minTTL: 3600,
    checkperiod: 1200,
    clientName: 'client',
    limitErrorValidator: validate,
    ReqLimitError,
};
const reqPort = Symbol('reqPort');
const checkPort = Symbol('checkPort');
const parseKey = Symbol('parseKey');
const cache = Symbol('credsCache');


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
        this.foldersId = {};
        this.empCounter = {};
        this[cache] = new NodeCache({
            stdTTL: this.config.stdTTL,
            checkperiod: this.config.checkperiod,
        });
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
    };

    [parseKey] = port => {
        return {
            client: () => `client-${port}`,
            setData: key => `${key}-${port}`,
        };
    };

    checkEmpPort = async (port) => {
        try {
            let attempts = 0;
            await this[checkPort](attempts, port, this.empCounter);
        } catch (error) {
            this[reqPort].toFreePort(port, this.empCounter);
            throw error;
        }
    };

    freeEmpPort = (port) => {
        this[reqPort].toFreePort(port, this.empCounter);
    }

    // getFoldersId = (port) => {
    //     return this.foldersId[port]
    // }

    /**
   * @param {object} params
   * @param {string}  params.port - name of the port you would like, of use
   * @param {string}  params.key - key for saving your data
   * @param {any}  params.data - data for save
   * @param {number}  params.ttl - ttl for your saving data
   * @returns {void} void
   * @memberof ReqLimiter
   */
    setToCashe = (port, { key, data, ttl }) => {
        return this[cache].set(this[parseKey](port).setData(key), data, ttl);
    };

    /**
     * @param {object} params
     * @param {string}  params.port - name of the port you would like, of use
     * @param {string}  params.key - key for take your saved data
     * @memberof ReqLimiter
     */
    getFromCashe = (port, key) => {
        return this[cache].get(this[parseKey](port).setData(key));
    };

    // setMainFolder = (port, mainFolderId) => {
    //     this.foldersId[port] = {};
    //     this.foldersId[port].mainFolderId = mainFolderId;
    // }

    // setEMailFolder = (port, emailFolderId, email) => {
    //     this.foldersId[port][email] = emailFolderId;
    // }

    /**
     * @param {string} port name of the port you would like, of use
     * @returns {any} ReqLimiter.clients - A cache that can be stored in a property `clients`
     * @memberof ReqLimiter
     */
    haveConnect = (port) => {
        if (!this.portsStatus[port]) {
            this.portsStatus[port] = 0;
            this.empCounter[port] = 0;
        }
    };

    /**
     * @param {string} port name of the port you would like, of use
     * @param {any} client cache that can be stored in a property `clients`
     * @memberof ReqLimiter
     */
    setClient = (port, client) => {
        this[cache].set(this[parseKey](port).client(), client);
    };

    existClient = (port) => {
        return this[cache].has(this[parseKey](port).client());
    }

    [reqPort] = {
        haveFreePort: (port, store) => store[port] < this.config.maxOneTimeReq,
        toUsePort: (port, store) => {
            store[port] += 1;
            if (store[port] > this.config.maxOneTimeReq) store[port] = this.config.maxOneTimeReq;
        },
        toFreePort: (port, store) => {
            store[port] -= 1;
            if (store[port] < 0) store[port] = 0;
        },
    }


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

            await this[checkPort](attempts, port, this.portsStatus);

            const result = await cb({
                ...args,
                [this.config.clientName]: this[cache].get(this[parseKey](port).client()),
            });
            this[reqPort].toFreePort(port, this.portsStatus);

            return result;
        } catch (error) {
            this[reqPort].toFreePort(port, this.portsStatus);
            if (this.config.limitErrorValidator(error)) {
                const reapetAttempts = this.config.maxAttempts - this.config.maxRepeatAttempts;

                const result = await this.reqWithCheck(port, cb, args, reapetAttempts);

                return result;
            }

            throw error;
        }
    };

    [checkPort] = async (attempts, port, store) => {
        return new Promise((resolve, reject) => {
            if (this[reqPort].haveFreePort(port, store)) {
                this[reqPort].toUsePort(port, store);

                return resolve();
            }

            if (attempts >= this.config.maxAttempts) {
                return reject(new this.config.ReqLimitError());
            }
            setTimeout(async () => {
                try {
                    attempts += 1;
                    await this[checkPort](attempts, port, store);

                    return resolve();
                } catch (error) {
                    return reject(error);
                }
            }, this.config.checkDelay);
        });
    };
}

module.exports = ReqLimiter;
