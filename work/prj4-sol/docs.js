'use strict';

const express = require('express');
const upload = require('multer')();
const fs = require('fs');
const mustache = require('mustache');
const Path = require('path');
const { URL } = require('url');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
  const base = app.locals.base;
  app.get(`${base}/search.html`, findTerm(app));
  app.get(`${base}/add.html`, addDoc(app));
  app.post(`${base}/add`, upload.single('file'), addDoc(app));
  app.get('/', function (req, res) {
      res.redirect('/docs');
  });
  app.get(`${base}/:id`, getDoc(app));
  //@TODO add appropriate routes
}

/*************************** Action Routines ***************************/

//@TODO add action routines for routes + any auxiliary functions.

function findTerm(app) {
    return async function(req, res) {
        let model;
        if(typeof req.query.q === "undefined") {
            res.send(doMustache(app, 'search', {}));
            return ;
        }

        if (req.query.q!=="") {
            try {
                model = await app.locals.model.find(req);
                let relUrl = relativeUrl(req,`${app.locals.base}/`);
                for (let res of model.results){
                    res.href = relUrl+res.name;
                    res.lines = highlight(res.lines, req.query.q);
                }
                if(model.results.length===0)
                    model.errors2 = 'no document containing \"' + req.query.q + '\" found; please retry';
                for(let link of model.links){
                    link.href = link.href.replace(model.docsUrl, relUrl+'search.html');
                }
            }
            catch (err) {
                console.error(err);
                let error = wsErrors(err);
                const model2 = errorModel(app, req.body, error);
                const html = doMustache(app, 'search', model2);
                res.send(html);
            }
            const html = doMustache(app, 'search', model);
            res.send(html);
        }
        else {
            const html = doMustache(app, 'search', {errors:'please specify one-or-more search terms'});
            res.send(html);
        }
    };
}

function highlight(line, query) {
    let words = query.split(' ');
    for(let word of words){
    let re = new RegExp("\\b"+word+"\\b", 'ig');
    line[0] = line[0].replace(re, '<span class="search-term">$&</span>');
    }
    return line;
}

function addDoc(app) {
    return async function(req, res) {
        if(!req.body) {
            res.send(doMustache(app, 'add', {}));
            return ;
        }
        let errors = validate(req, ['file']);
        if (!errors) {
            try {
                await app.locals.model.create({name:req.file.originalname.slice(0,-4), content:req.file.buffer.toString('utf8')});
                res.redirect(`/docs/${req.file.originalname.slice(0,-4)}`);
            }
            catch (err) {
                console.error(err);
                let error = wsErrors(err);
                const model = errorModel(app, req.body, error);
                const html = doMustache(app, 'error', model);
                res.send(html);
            }
        }
        if (errors) {
            const html = doMustache(app, 'add', {errors:'please select a file containing a document to upload'});
            res.send(html);
        }
    };
}

function getDoc(app) {
    return async function(req, res) {
        let model;
        const id = req.params.id;
        try {
            model = await app.locals.model.get(id);
        }
        catch (err) {
            console.error(err);
            const errors = wsErrors(err);
            model = errorModel(app, {}, errors);
        }
        const html = doMustache(app, 'details', model);
        res.send(html);
    };
}

function errorModel(app, values={}, errors={}) {
    return {
        base: app.locals.base,
        errors: errors._,
    };
}

function wsErrors(err) {
    const msg = (err.message) ? err.message : 'web service error';
    console.error(msg);
    return { _: [ msg ] };
}

/************************ General Utilities ****************************/

/** return object containing all non-empty values from object values */
function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}

function validate(values, requires=[]) {
    const errors = {};
    requires.forEach(function (name) {
        if (values[name] === undefined) {
            errors[name] =
                `A value must be provided`;
        }
    });

    return Object.keys(errors).length > 0 && errors;
}

/** Return a URL relative to req.originalUrl.  Returned URL path
 *  determined by path (which is absolute if starting with /). For
 *  example, specifying path as ../search.html will return a URL which
 *  is a sibling of the current document.  Object queryParams are
 *  encoded into the result's query-string and hash is set up as a
 *  fragment identifier for the result.
 */
function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

/************************** Template Utilities *************************/


/** Return result of mixing view-model view into template templateId
 *  in app templates.
 */
function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

/** Add contents all dir/*.ms files to app templates with each 
 *  template being keyed by the basename (sans extensions) of
 *  its file basename.
 */
function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

