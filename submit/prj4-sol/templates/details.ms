<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
    <link rel="stylesheet" href="/docs/css/style.css">
  </head>
  <body>
    <h1 class="doc-name">{{title}}</h1>
    <ul>{{#errors}}
        <li class="error">{{errors}}</li>{{/errors}}
    </ul>
    <pre class="content">{{content}}</pre>
    {{>footer}}
  </body>
</html>