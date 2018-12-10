//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Search extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   */
  constructor(props) {
      super(props);
      this.state = {value: '', val: '', error: ''};
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
  }

  //@TODO

    highlighter(line, query){
        let words = query.split(' ');
        for(let word of words){
            let re = new RegExp("\\b"+word+"\\b", 'ig');
            line = line.replace(re, '<span class="search-term">$&</span>');
        }
        return line;
    }

    handleChange(event) {
        this.setState({value: event.target.value});
    }

    handleClick(content){
        event.preventDefault();
        this.props.app.setContentName(content);
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.state.error = '';
        let vl = await this.props.app.ws.searchDocs(this.state.value);
        let newList = [];
        for (let res in vl.results){
            newList.push(<div key={res} className="result"><a className="result-name"
            href={vl.results[res].name} onClick={()=>{this.handleClick(vl.results[res].name)}}> {vl.results[res].name}</a><br/><p dangerouslySetInnerHTML={{__html:
                    this.highlighter(vl.results[res].lines[0],
                        this.state.value)}}></p></div>);
        }
        if (newList.length>0){
        this.setState({val: newList});
        }else{
            this.setState({val: newList, error: 'No results for '+this.state.value});
        }
    }


    render() {
    //@TODO
    return (
        <form onSubmit={this.handleSubmit}>
            <label>
                Search Terms: &nbsp;&nbsp;
                <input type="text" value={this.state.value} onChange={this.handleChange} onBlur={this.handleSubmit}/>
            </label>
            <div>{this.state.val}</div>
            <span className="error">{this.state.error}</span>
        </form>
    );
  }
}

module.exports = Search;
/*<span className="error">No results for Testing</span>*/