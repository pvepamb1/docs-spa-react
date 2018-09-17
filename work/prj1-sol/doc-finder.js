const {inspect} = require('util'); //for debugging
let noiseWordsSet, keyWordsSet;
let addedKeyWords = false;

'use strict';

class DocFinder {

    /** Constructor for instance of DocFinder. */
    constructor() {
        this.library = new Map();
        this.keyWordsMap = new Map();
    }

    /** Return array of non-noise normalized words from string content.
     *  Non-noise means it is not a word in the noiseWords which have
     *  been added to this object.  Normalized means that words are
     *  lower-cased, have been stemmed and all non-alphabetic characters
     *  matching regex [^a-z] have been removed.
     */
    words(content) {
        if (addedKeyWords === false)
            this.addSearchWords();
        let temp = content.split(/\s+/).map(x => normalize(x)).filter(x => this.isNoiseWord(x));
        this._wordsLow(temp);
        return temp;
    }

    /** Returns false if the word is a noiseword, and true otherwise.
     *  return values are inverted to make it easy for filter functions.
     */
    isNoiseWord(word) {
        return !noiseWordsSet.has(word);
    }

    /** Indexes all possible search terms with an object as value.
     *  The object houses details about the search term, such as
     *  no. of occurrences, offset of first occurrence and the titles.
     */
    _wordsLow(content) {
        let set2 = new Set(content);
        for (let word of keyWordsSet) {
            let titleArray = [], offsetArray = [], times = [];
            for (let entrySet of this.library) {
                let regex = new RegExp(word, "i");
                let regex2 = new RegExp(word, "ig");
                if (regex.test(entrySet[1])) {
                    titleArray.push(entrySet[0]);
                    offsetArray.push(entrySet[1].toLowerCase().indexOf(word));
                    times.push(entrySet[1].match(regex2).length);
                }
            }
            this.keyWordsMap.set(word, {titles: titleArray, offset: offsetArray, occurrences: times});
        }
    }

    /** Builds a set of all possible search terms*/
    addSearchWords() {

        //let tmp4 = Array.from(this.library.values()).map(x => x.replace(/\n/g, " ").split(" "));
        //map(x => normalize(x)).filter(x => this.isNoiseWord(x))
        let tmp = [];
        for (let value of this.library.values()) {
            tmp.push.apply(tmp,value.replace(/\n/g, " ").split(" ").map(x => normalize(x)).filter(x => this.isNoiseWord(x)));
        }
        keyWordsSet = new Set(tmp);
        addedKeyWords = true;
    }

    /** Add all normalized words in noiseWords string to this as
     *  noise words.
     */
    addNoiseWords(noiseWords) {
        noiseWordsSet = new Set(noiseWords.split(/\n/));
    }

    /** Add document named by string name with specified content to this
     *  instance. Update index in this with all non-noise normalized
     *  words in content string.
     */
    addContent(name, content) {
        this.library.set(name, content);
    }

    /** Given a list of normalized, non-noise words search terms,
     *  return a list of Result's  which specify the matching documents.
     *  Each Result object contains the following properties:
     *     name:  the name of the document.
     *     score: the total number of occurrences of the search terms in the
     *            document.
     *     lines: A string consisting the lines containing the earliest
     *            occurrence of the search terms within the document.  Note
     *            that if a line contains multiple search terms, then it will
     *            occur only once in lines.
     *  The Result's list must be sorted in non-ascending order by score.
     *  Results which have the same score are sorted by the document name
     *  in lexicographical ascending order.
     *
     */
    find(terms) {
        let results = [];
        for (let term of terms) {
            let res = this.keyWordsMap.get(term.toLowerCase());
            for (let i = 0; i < res.titles.length; i++) {
                results.push(new Result(res.titles[i], res.occurrences[i], this.findLine(res.titles[i], res.offset[i])));
            }
        }
        return results.sort(compareResults);
    }

    /** Given a document and an offset, returns the line in the document*/
    findLine(title, offset) {
        let doc = this.library.get(title.toLowerCase());
        let start = doc.substring(0, offset).lastIndexOf('\n');
        let end = doc.substr(offset).indexOf('\n')+offset;
        return doc.substring(start+1, end) + '\n';
    }

    /** Given a text string, return a ordered list of all completions of
     *  the last word in text.  Returns [] if the last char in text is
     *  not alphabetic.
     */
    complete(text) {
        if (addedKeyWords === false)
            this.addSearchWords();
        return keyWordsSet.filter(x => x.startsWith(text));
        /*let temp = [];
        for (let word of keyWordsSet) {
            if (word.startsWith(text)) {
                temp.push(word);
            }
        }*/
        //return temp;
    }


} //class DocFinder

module.exports = DocFinder;

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple class which packages together the result for a
 *  document search as documented above in DocFinder.find().
 */
class Result {
    constructor(name, score, lines) {
        this.name = name;
        this.score = score;
        this.lines = lines;
    }

    toString() {
        return `${this.name}: ${this.score}\n${this.lines}`;
    }
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

