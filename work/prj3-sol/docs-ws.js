'use strict';

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const url = require('url');
const queryString = require('querystring');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;


const ERROR_MAP = {
    EXISTS: CONFLICT,
    NOT_FOUND: NOT_FOUND
}

//Main URLs
const DOCS = '/docs';
const COMPLETIONS = '/completions';

//Default value for count parameter
const COUNT = 5;

/** Listen on port for incoming requests.  Use docFinder instance
 *  of DocFinder to access document collection methods.
 */
function serve(port, docFinder) {
  const app = express();
  app.locals.port = port;
  app.locals.finder = docFinder;
  setupRoutes(app);
  const server = app.listen(port, async function() {
    console.log(`PID ${process.pid} listening on port ${port}`);
  });
  return server;
}

module.exports = { serve };

function setupRoutes(app) {
  app.use(cors());            //for security workaround in future projects
  app.use(bodyParser.json()); //all incoming bodies are JSON
  app.get(COMPLETIONS, getCompletions(app))
  app.get(DOCS+'/:name', getContent(app))
  app.get(DOCS, searchContent(app))
  //@TODO: add routes for required 4 services

  app.use(doErrors()); //must be last; setup for server errors   
}

function getCompletions(app) {
    return errorWrap(async function(req, res) {
        try {
            const TEXT = req.query.text;
            const results = await app.locals.finder.complete(TEXT);
            if (results.length === 0) {
                throw {
                    isDomain: true,
                    errorCode: 'NOT_FOUND',
                    message: `completions ${id} not found`,
                };
            }
            else {
                res.json(results);
            }
        }
        catch(err) {
            const mapped = mapError(err);
            res.status(mapped.status).json(mapped);
        }
    });
}

function searchContent(app) {
    return errorWrap(async function(req, res) {
        try {
            const q = req.query.q;
            if(!req.query.start) {req.query.start =0; req.url += '&start=0';}
            if(!req.query.count) {req.query.count = 5; req.url += '&count=5';}
            const results = await app.locals.finder.find(q);
            if (results.length === 0) {
                throw {
                    isDomain: true,
                    errorCode: 'NOT_FOUND',
                    message: `content ${q} not found`,
                };
            }
            else {
                results.length = req.query.count;
                for(let val in results)
                results[val].href=baseUrl(req,DOCS+'/'+results[val].name)
                let results2={results: results.slice(req.query.start), totalCount: results.length, links:[{rel:'self', href:baseUrl(req,req.url)}]}
                res.json(results2);
            }
        }
        catch(err) {
            const mapped = mapError(err);
            res.status(mapped.status).json(mapped);
        }
    });
}

function getContent(app) {
    return errorWrap(async function(req, res) {
        try {
            const name = req.params.name;
            const results = await app.locals.finder.docContent(name);
            res.json(results);
        }
        catch(err) {
            err.isDomain=true;
            err.errorCode = 'NOT_FOUND';
            const mapped = mapError(err);
            res.status(mapped.status).json(mapped);
        }
    });
}
//@TODO: add handler creation functions called by route setup
//routine for each individual web service.  Note that each
//returned handler should be wrapped using errorWrap() to
//ensure that any internal errors are handled reasonably.

/** Return error handler which ensures a server error results in nice
 *  JSON sent back to client with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}

function mapError(err) {
    console.error(err);
    return err.isDomain
        ? { status: (ERROR_MAP[err.errorCode] || BAD_REQUEST),
            code: err.errorCode,
            message: err.message
        }
        : { status: SERVER_ERROR,
            code: 'INTERNAL',
            message: err.toString()
        };
}

/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}
  

/** Return base URL of req for path.
 *  Useful for building links; Example call: baseUrl(req, DOCS)
 */
function baseUrl(req, path='/') {
  const port = req.app.locals.port;
  const url = `${req.protocol}://${req.hostname}:${port}${path}`;
  return url;
}
