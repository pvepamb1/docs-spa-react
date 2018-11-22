'use strict';

const axios = require('axios');


function DocsWs(baseUrl) {
  this.docsUrl = `${baseUrl}/docs`;
}

module.exports = DocsWs;


DocsWs.prototype.get = async function(id) {
    try {
        const response = await axios.get(`${this.docsUrl}/${id}`);
        response.data['title'] = id;
        return response.data;
    }
    catch (err) {
        console.error(err);
        throw (err.response && err.response.data) ? err.response.data : err;
    }
};

DocsWs.prototype.create = async function(user) {
    try {
        const response = await axios.post(this.docsUrl, user);
        return response.data;
    }
    catch (err) {
        console.error(err);
        throw (err.response && err.response.data) ? err.response.data : err;
    }
};

DocsWs.prototype.find = async function(user) {
    try {
        const response = await axios.get(this.docsUrl+ queryAppend(user));
        response.data.docsUrl = this.docsUrl;
        return response.data;
    }
    catch (err) {
        console.error(err);
        throw (err.response && err.response.data) ? err.response.data : err;
    }
};

function queryAppend(req){
    let res = "?";
    for( let param of Object.keys(req.query)){
        res += param + '=' + req.query[param] + '&';
    }
    res = res.substring(0, res.length-1);
    return res;
}
//@TODO add wrappers to call remote web services.
  
