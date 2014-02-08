(function(window, undefined) {
  "use strict";

  var rulesFound = [],

  findStylesheets = function () {
    var matches = [],
        links = document.getElementsByTagName('link');

    for (var i = 0; i < links.length; i++) {
      var link = links[i];

      if (link.rel.toLowerCase() === 'stylesheet') {
        matches.push(link.href);
      }
    }

    return matches;
  },

  parseRule = function(rule) {
    rule = rule.trim();

    while (rule[rule.length - 1] == ';') {
      rule = rule.substring(0, rule.length - 1);
    }

    return {
      property: rule.substring(0, rule.indexOf(':')),
      value: rule.substring(rule.indexOf(':') + 1).replace('!muyimportante', '!important').trim()
    }
  },

  formatRules = function(rules) {
    var obj = {};

    for (var i = 0; rules && i < rules.length; i++) {
      var rule = rules[i];
      obj[rule.property] = rule.value;
    }

    return obj;
  },

  parseStylesheet = function(response, current, total) {
    response = response && response.responseText;

    if (response) {
      //find selectors that use muyimportant in one or more of their rules,
      var cleaned = removeComments(removeMediaQueries(response)),

          pattern = /[\w\d\s\-\/\\\[\]:,.'"*()<>+~%#^$_=|@]+\{[\w\d\s\-\/\\%#:;,.'"!*()]+!muyimportante[\w\d\s\-\/\\%#:;,.'"!*()]*\}/g,
          selectorsFound = cleaned.match(pattern),

          pattern = /[\w\d\s\-\/\\%#:,.'"!*()]+!muyimportante[\w\d\s\-\/\\%#:,.'"!*()]*[;}]/g;

      for (var i = 0; selectorsFound && i < selectorsFound.length; i++) {
        var selector = selectorsFound[i],
            rules = selector.match(pattern),
            rules = rules.map(parseRule);

        rulesFound.push({
          index: current,
          selector: selector.substring(0, selector.indexOf('{')).trim(),
          rules: formatRules(rules)
        });
      }
    }

    if (current == total) {
      buildCss();
    }
  },

  buildCss = function() {
    rulesFound = rulesFound.sort(function(a, b) {
      return a.index > b.index;
    });

    var mergedCss = {};

    for (var i = 0; rulesFound && i < rulesFound.length; i++) {
      var found = rulesFound[i],
          selector = mergedCss[found.selector];

      if (!selector) {
        selector = mergedCss[found.selector] = {
          rules: found.rules
        };
      } else {
        for (var rule in found.rules) {
          selector.rules[rule] = found.rules[rule];
        }
      }
    }

    applyCss(mergedCss);
  },

  applyCss = function(selectors) {
    for (var s in selectors) {
      var selector = selectors[s];
      var items = document.querySelectorAll(s);

      for (var i = 0; items && i < items.length; i++) {
        var item = items[i];

        for (var property in selector.rules) {
          // Remove previous property
          if (item.style.setProperty) {
            item.style.setProperty(property, '');
          } else {
            item.style.setAttribute(property, '');
          }

          item.style.cssText += ';' + property + ':' + selector.rules[property] + ';';
        }
      }
    }
  },

  removeComments = function ( css ) {
    var start = css.search(/\/\*/),
        end = css.search(/\*\//);
    if ( (start > -1) && (end > start) ) {
      css = css.substring(0, start) + css.substring(end + 2);
      return removeComments(css);
    }
    else {
      return css;
    }
  },

  // Remove queries.
  removeMediaQueries = function(css) {
    return css.replace(/@media[\s\S]*?\}\s*\}/, "");
  },

  loadStylesheet = function(url, callback, current, total) {
    try {
      var xhr = getXMLHttpRequest();
      xhr.open( 'GET', url, true );
      xhr.send();
      var ie = (function () { //function checking IE version
      var undef,
          v = 3,
          div = document.createElement('div'),
          all = div.getElementsByTagName('i');
          while (
            div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
            all[0]
          );
      return v > 4 ? v : undef;
      }());

      if ( ie > 7 || ie === undefined ){ //If IE is greater than 6
        // This targets modern browsers and modern versions of IE,
        // which don't need the "new" keyword.
        xhr.onreadystatechange = function () {
          if ( xhr.readyState === 4 ){
            callback(xhr, current, total);
          } // else { callback function on AJAX error }
        };
      } else {
        // We need queryselector all, so IE 8-, no support, sorry :)
      }
    } catch (e) {
      if ( window.XDomainRequest ) {
        var xdr = new XDomainRequest();
        xdr.open('get', url);

        xdr.onload = function() {
          callback(xdr, current, total);
        };
        xdr.onerror = function() {
          return false; // xdr load fail
        };
        xdr.send();
      }
    }
  },

  getXMLHttpRequest = function () { // we're gonna check if our browser will let us use AJAX
    if (window.XMLHttpRequest) {
      return new XMLHttpRequest();
    } else { // if XMLHttpRequest doesn't work
      try {
        return new ActiveXObject("MSXML2.XMLHTTP"); // then we'll instead use AJAX through ActiveX for IE6/IE7
      } catch (e1) {
        try {
          return new ActiveXObject("Microsoft.XMLHTTP"); // other microsoft
        } catch (e2) {
          // No XHR at all...
        }
      }
    }
  },

  sheets = findStylesheets();

  for (var i = 0; sheets && i < sheets.length; i++) {
    loadStylesheet(sheets[i], parseStylesheet, i, sheets.length - 1);
  }


})(window);
