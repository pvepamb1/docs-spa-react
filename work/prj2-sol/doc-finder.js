const assert = require('assert');
const mongo = require('mongodb').MongoClient;

const {inspect} = require('util'); //for debugging

'use strict';

/** This class is expected to persist its state.  Hence when the
 *  class is created with a specific database url, it is expected
 *  to retain the state it had when it was last used with that URL.
 */ 
class DocFinder {

  /** Constructor for instance of DocFinder. The dbUrl is
   *  expected to be of the form mongodb://SERVER:PORT/DB
   *  where SERVER/PORT specifies the server and port on
   *  which the mongo database server is running and DB is
   *  name of the database within that database server which
   *  hosts the persistent content provided by this class.
   */
  constructor(dbUrl) {
    this.url = dbUrl;
    this.dbName = dbUrl.substring(dbUrl.lastIndexOf('/')+1);
    this.client = null;
    this.database = null;
    this.noise = null;
    this.contents = new Map();
    this.indexes = null;
    this.completions = new Map();
    this.isComplete = false;
  }

  /** This routine is used for all asynchronous initialization
   *  for instance of DocFinder.  It must be called by a client
   *  immediately after creating a new instance of this.
   */
  async init() {
      try {
          this.client = await mongo.connect(this.url, {useNewUrlParser: true});
          this.database = await this.client.db(this.dbName);
          this.test = await this.database.collection('noiseWords').find('words').toArray();
          if(this.test.length!==0)
          this.noise = await new Set(this.test[0].words.split('\n'))
          else this.noise = new Set();
          this.indexes1 = await this.database.collection('wordMap').find({name:"map"}).toArray();
          if(this.indexes1.length!==0)
          this.indexes2 = this.indexes1[0].content;
          else this.indexes2 = new Map();
          this.indexes = new Map(Object.entries(this.indexes2));
          this.contents1 = await this.database.collection('titles').find({name:"map2"}).toArray();
          if(this.contents1.length!==0)
          this.contents2 = this.contents1[0].content;
          else this.contents2 = new Map();
          this.contents = new Map(Object.entries(this.contents2));
      } catch (err) {
          console.log(err.stack);
      }
  }

  /** Release all resources held by this doc-finder.  Specifically,
   *  close any database connections.
   */
  async close() {
    await this.client.close();
  }

  /** Clear database */
  async clear() {
    await this.database.dropDatabase();
  }

  /** Return an array of non-noise normalized words from string
   *  contentText.  Non-noise means it is not a word in the noiseWords
   *  which have been added to this object.  Normalized means that
   *  words are lower-cased, have been stemmed and all non-alphabetic
   *  characters matching regex [^a-z] have been removed.
   */
  async words(contentText) {
      return this._wordsLow(contentText).map((pair) => pair[0]);
  }

  /** Add all normalized words in the noiseText string to this as
   *  noise words.  This operation should be idempotent.
   */
  async addNoiseWords(noiseText) {
    await this.database.collection('noiseWords').updateOne({},{$set:{words:noiseText}},{upsert:true});
  }

  /** Add document named by string name with specified content string
   *  contentText to this instance. Update index in this with all
   *  non-noise normalized words in contentText string.
   *  This operation should be idempotent.
   */ 
  async addContent(name, contentText) {
      if (!contentText.endsWith('\n')) contentText += '\n';
      this.contents.set(name, contentText);
      this._wordsLow(contentText).forEach((pair) => {
          const [word, offset] = pair;
          let wordIndex = this.indexes.get(word);
          if (!wordIndex) this.indexes.set(word, wordIndex = new Map());
          else if(!(wordIndex instanceof Map))wordIndex = new Map(Object.entries(wordIndex));
          let wordInfo = wordIndex.get(name);
          if (!wordInfo) wordIndex.set(name, wordInfo = [0, offset]);
          wordInfo[0]++;
      });
      await this.database.collection('wordMap').updateOne({name:'map'}, {$set:{name:'map', content:this.indexes}}, {upsert: true});
      await this.database.collection('titles').updateOne({name:'map2'}, {$set:{name:'map2', content:this.contents}}, {upsert:true});
      this.isComplete = false;
  }

    _wordsLow(content) {
        const words = [];
        let match;
        while (match = WORD_REGEX.exec(content)) {
            const word = normalize(match[0]);
            if (word && !this.noise.has(word)) {
                words.push([word, match.index]);
            }
        }
        return words;
    }

  /** Return contents of document name.  If not found, throw an Error
   *  object with property code set to 'NOT_FOUND' and property
   *  message set to `doc ${name} not found`.
   */
  async docContent(name) {
        if(this.contents.has(name))
            return await this.contents.get(name);
        else {
            let err = new Error('doc ' + name +' not found');
            err.code = 'NOT_FOUND';
            throw err;
        }
  }
  
  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  The 
   *            lines must have the same relative order as in the source
   *            document.  Note that if a line contains multiple search 
   *            terms, then it will occur only once in lines.
   *
   *  The returned Result list must be sorted in non-ascending order
   *  by score.  Results which have the same score are sorted by the
   *  document name in lexicographical ascending order.
   *
   */
  async find(terms) {
      const docs = this._findDocs(terms);
      const results = [];
      for (const [name, wordInfos] of docs.entries()) {
          const contents = this.contents.get(name);
          const score =
              wordInfos.reduce((acc, wordInfo) => acc + wordInfo[0], 0);
          const offsets = wordInfos.map(wordInfo => wordInfo[1]);
          results.push(new OffsetResult(name, score, offsets).result(contents));
      }
      results.sort(compareResults);
      return results;
  }

    _findDocs(terms) {
        const docs = new Map();
        terms.forEach((term) => {
            const termIndex = this.indexes.get(term);
            if (termIndex) {
                for (const [name, idx] of Object.entries(termIndex)) {
                    let docIndex = docs.get(name);
                    if (!docIndex) docs.set(name, docIndex = []);
                    docIndex.push(idx);
                }
            }
        });
        return docs;
    }

    _findDocs2(terms) {
        const docs = new Map();
        terms.forEach((term) => {
            this.cur = this.database.collection('wordMap').find({},{term:1});
            const termIndex = this.cur;//.get(term);
            if (termIndex) {
                for (const [name, idx] of Object.entries(termIndex)) {
                    let docIndex = docs.get(name);
                    if (!docIndex) docs.set(name, docIndex = []);
                    docIndex.push(idx);
                }
            }
        });
        return docs;
    }

  /** Given a text string, return a ordered list of all completions of
   *  the last normalized word in text.  Returns [] if the last char
   *  in text is not alphabetic.
   */
  async complete(text) {
      if (!this.isComplete) this._makeCompletions();
      if (!text.match(/[a-zA-Z]$/)) return [];
      const word = text.split(/\s+/).map(w=>normalize(w)).slice(-1)[0];
      return (this.completions.get(word[0]))?this.completions.get(word[0]).filter((w) => w.startsWith(word)):'';
  }

    _makeCompletions() {
        const completions = new Map();
        for (const word of this.indexes.keys()) {
            const c = word[0];
            if (!completions.get(c)) completions.set(c, []);
            completions.get(c).push(word);
        }
        for (const [c, words] of completions) { words.sort(); }
        this.completions = completions;
        this.isComplete = true;
    }

  //Add private methods as necessary

} //class DocFinder

module.exports = DocFinder;

//Add module global functions, constants classes as necessary
//(inaccessible to the rest of the program).

//Used to prevent warning messages from mongodb.
const MONGO_OPTIONS = {
  useNewUrlParser: true
};

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple utility class which packages together the result for a
 *  document search as documented above in DocFinder.find().
 */ 
class Result {
  constructor(name, score, lines) {
    this.name = name; this.score = score; this.lines = lines;
  }

  toString() { return `${this.name}: ${this.score}\n${this.lines}`; }
}

/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
  return (result2.score - result1.score) ||
    result1.name.localeCompare(result2.name);
}

/** Normalize word by stem'ing it, removing all non-alphabetic
 *  characters and converting to lowercase.
 */
function normalize(word) {
  return stem(word.toLowerCase()).replace(/[^a-z]/g, '');
}

/** Place-holder for stemming a word before normalization; this
 *  implementation merely removes 's suffixes.
 */
function stem(word) {
  return word.replace(/\'s$/, '');
}
class OffsetResult {
    constructor(name, score, offsets) {
        this.name = name; this.score = score; this.offsets = offsets;
    }

    /** Convert this to a Result by using this.offsets to extract
     *  lines from contents.
     */
    result(contents) {
        const starts = new Set();
        this.offsets.forEach(o => starts.add(contents.lastIndexOf('\n', o) + 1));
        let lines = '';
        for (const i of Array.from(starts).sort((a, b) => a-b)) {
            lines += contents.substring(i, contents.indexOf('\n', i) + 1);
        }
        return new Result(this.name, this.score, lines);
    }
}


