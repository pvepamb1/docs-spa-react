
<!DOCTYPE html>
<html>
<head>
    <title>Documents Collections Search</title>
    <link rel="stylesheet" href="/docs/css/style.css">
</head>
<body>
<h1>Documents Collection Search</h1>
<ul>
    {{#errors2}}<li class="error">{{errors2}}</li>{{/errors2}}
</ul>
<form method="GET" action="/docs/search.html">
    <p>
        Please fill in one or more search terms in the field below:
    </p>
    <label>
        <span class="label">Search Terms:</span>
        <input id="query" name="q" value="">
    </label>
    <br/>
    {{#errors}}<span class="error">{{errors}}</span><br/>{{/errors}}
    </label>
    <input id="submit" name="submit" type="submit"
           value="search" class="control">
</form>
{{#results.length}}
<h2>Search Results</h2>
{{/results.length}}
{{#results}}
<p class="result">
	  <a class="doc-name" href={{href}}>{{name}}</a><br>
	  {{{lines}}}
<br>
</p>
{{/results}}
{{#links.1}}
<a id={{links.1.rel}} href={{links.1.href}}>{{links.1.rel}}</a>
{{#links.2}}
<a id={{links.2.rel}} href={{links.2.href}}>{{links.2.rel}}</a>
{{/links.2}}
{{/links.1}}
{{>footer}}
</body>
</html>