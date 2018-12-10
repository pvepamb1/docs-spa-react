//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Content extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   *  name:Name of document to be displayed.
   */
  constructor(props) {
    super(props);
    this.state = {content:''}
  }

  async componentDidMount(){
      if(this.props.name){
        let vl = await this.props.app.ws.getContent(this.props.name);
        this.setState({content: vl});
      }
  }

  async componentDidUpdate(){
      let vl = await this.props.app.ws.getContent(this.props.name);
      this.setState({content: vl});
  }

  //@TODO

  render() {
    //@TODO
    return (
        <section><h1>{this.props.name}</h1><pre>{this.state.content}</pre></section>
    );
  }

}

module.exports = Content;
