//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Add extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   */
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.fileInput = React.createRef();
  }

  handleSubmit(event){
      event.preventDefault();
      console.log(this.fileInput.current.files[0]);
      let fileReader = new FileReader();
      fileReader.readAsText(this.fileInput.current.files[0]);
      let res;
      fileReader.onloadend = async function(e){
          console.log(e.target.result);
          res = e.target.result;
          let name = this.fileInput.current.files[0].name.split('.')[0];
          console.log(await this.props.app.ws.addContent(name, res));
          this.props.app.setContentName(name);
      }.bind(this);
  }

  //@TODO add code

  //Note that a you can get information on the file being uploaded by
  //hooking the change event on <input type="file">.  It will have
  //event.target.files[0] set to an object containing information
  //corresponding to the uploaded file.  You can get the contents
  //of the file by calling the provided readFile() function passing
  //this object as the argument.


  render() {
      return (
          <form>
              <label>
                  Choose file: &nbsp;&nbsp;
                  <input type="file" accept=".txt" ref={this.fileInput} onChange={this.handleSubmit}/>
              </label>
              <br />
          </form>
      );
  }

}

module.exports = Add;

/** Return contents of file (of type File) read from user's computer.
 *  The file argument is a file object corresponding to a <input
 *  type="file"/>
 */
async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>  resolve(reader.result);
    reader.readAsText(file);
  });
}