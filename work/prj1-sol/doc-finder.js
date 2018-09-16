const {inspect} = require('util'); //for debugging
let set, set3;
let added = false;

'use strict';

class DocFinder {

    /** Constructor for instance of DocFinder. */
    constructor() {
        this.contents = new Map();
        this.contents2 = new Map();
    }

    /** Return array of non-noise normalized words from string content.
     *  Non-noise means it is not a word in the noiseWords which have
     *  been added to this object.  Normalized means that words are
     *  lower-cased, have been stemmed and all non-alphabetic characters
     *  matching regex [^a-z] have been removed.
     */
    words(content) {
        if(added==false)
            this.addSearchWords();
        let words = normalize(content);
        for(let word of set){
            words.replace(word, '');
        }
        let temp = words.split(/\s+/);
        this._wordsLow(temp);
        return temp;
    }

    _wordsLow(content){
        let set2 = new Set(content);
        for(let word of set2){
            let tmp = [], tmp2 = [], times = [];
            for(let key of this.contents){
                let regex = new RegExp(word, "i");
                let regex2 = new RegExp(word, "ig");
                if(regex.test(key[1])){
                    tmp.push(key[0]);
                    tmp2.push(key[1].toLowerCase().indexOf(word)); //potential bottleneck, check later
                    times.push(key[1].match(regex2).length);
                }
            }
            //this.contents2.set(word,{occurrences:this.wordCount(word, content), offset:this.wordOffset(word, content)});
            this.contents2.set(word, {titles: tmp, offset: tmp2, occurrences: times});
        }

        //this.words(content);
    }


    addSearchWords() {
        let tmp , tmp3 = [];
        for(let value of this.contents.values()){
            //let value = title.getKey();
            tmp = value.replace( /\n/g, " " ).split( " " );
            for(let tmp2 of tmp){
                let tmpval = normalize(tmp2);
                if(!set.has(tmpval))
                    tmp3.push(tmpval);
            }
        }
        set3 = new Set(tmp3);
        added = true;
    }
    /** Add all normalized words in noiseWords string to this as
     *  noise words.
     */
    addNoiseWords(noiseWords) {
        set = new Set(noiseWords.split(/\n/));
    }

    /** Add document named by string name with specified content to this
     *  instance. Update index in this with all non-noise normalized
     *  words in content string.
     */
    addContent(name, content) {
        this.contents.set(name, content);
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
        let res3 = [];
        for(let term of terms){
        let res = this.contents2.get(term.toLowerCase());
        for(let i=0; i<res.titles.length; i++){
        let res2 = new Result(res.titles[i], res.occurrences[i], this.findLine(res.titles[i], res.offset[i]));
        res3.push(res2);
        }
        }
        return res3.sort(compareResults);
    }

    findLine(title, offset){
       let doc = this.contents.get(title.toLowerCase());
       let i = offset;
       while(i!=0 && !doc[i].match('\n')){
       i--;
       }
       let end = offset;
       while(!doc[end].match('\n')){
           end++;
       }
       return doc.substring(i,end);
    }

    /** Given a text string, return a ordered list of all completions of
     *  the last word in text.  Returns [] if the last char in text is
     *  not alphabetic.
     */
    complete(text) {
        if(added==false)
            this.addSearchWords();
        let temp = [];
        for(let word of set3){
            if(word.startsWith(text)){
                temp.push(word);
            }
        }
        return temp;
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

