"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[172],{3905:function(e,t,r){r.d(t,{Zo:function(){return p},kt:function(){return k}});var a=r(7294);function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function l(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,a)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?l(Object(r),!0).forEach((function(t){n(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):l(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function s(e,t){if(null==e)return{};var r,a,n=function(e,t){if(null==e)return{};var r,a,n={},l=Object.keys(e);for(a=0;a<l.length;a++)r=l[a],t.indexOf(r)>=0||(n[r]=e[r]);return n}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(a=0;a<l.length;a++)r=l[a],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(n[r]=e[r])}return n}var o=a.createContext({}),u=function(e){var t=a.useContext(o),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},p=function(e){var t=u(e.components);return a.createElement(o.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},d=a.forwardRef((function(e,t){var r=e.components,n=e.mdxType,l=e.originalType,o=e.parentName,p=s(e,["components","mdxType","originalType","parentName"]),d=u(r),k=n,c=d["".concat(o,".").concat(k)]||d[k]||m[k]||l;return r?a.createElement(c,i(i({ref:t},p),{},{components:r})):a.createElement(c,i({ref:t},p))}));function k(e,t){var r=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var l=r.length,i=new Array(l);i[0]=d;var s={};for(var o in t)hasOwnProperty.call(t,o)&&(s[o]=t[o]);s.originalType=e,s.mdxType="string"==typeof e?e:n,i[1]=s;for(var u=2;u<l;u++)i[u]=r[u];return a.createElement.apply(null,i)}return a.createElement.apply(null,r)}d.displayName="MDXCreateElement"},4478:function(e,t,r){r.r(t),r.d(t,{assets:function(){return p},contentTitle:function(){return o},default:function(){return k},frontMatter:function(){return s},metadata:function(){return u},toc:function(){return m}});var a=r(7462),n=r(3366),l=(r(7294),r(3905)),i=["components"],s={},o=void 0,u={unversionedId:"api/lib/models/user.js",id:"api/lib/models/user.js",title:"user.js",description:"User",source:"@site/docs/api/lib/models/user.js.md",sourceDirName:"api/lib/models",slug:"/api/lib/models/user.js",permalink:"/gabrielcsapo/deploy.sh/docs/api/lib/models/user.js",editUrl:"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/docs/api/lib/models/user.js.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"request.js",permalink:"/gabrielcsapo/deploy.sh/docs/api/lib/models/request.js"},next:{title:"server.js",permalink:"/gabrielcsapo/deploy.sh/docs/api/lib/server.js"}},p={},m=[{value:"User",id:"user",level:2},{value:"new User()",id:"new-user",level:3},{value:"User.authenticateMiddleware(req, res, next)",id:"userauthenticatemiddlewarereq-res-next",level:3},{value:"User.authenticate(token, username) \u21d2 <code>Promise</code>",id:"userauthenticatetoken-username--promise",level:3},{value:"User.logout(token, username) \u21d2 <code>Promise</code>",id:"userlogouttoken-username--promise",level:3},{value:"User.login(username, password) \u21d2 <code>Promise</code>",id:"userloginusername-password--promise",level:3},{value:"User.register(username, password) \u21d2 <code>Promise</code>",id:"userregisterusername-password--promise",level:3}],d={toc:m};function k(e){var t=e.components,r=(0,n.Z)(e,i);return(0,l.kt)("wrapper",(0,a.Z)({},d,r,{components:t,mdxType:"MDXLayout"}),(0,l.kt)("a",{name:"User"}),(0,l.kt)("h2",{id:"user"},"User"),(0,l.kt)("p",null,(0,l.kt)("strong",{parentName:"p"},"Kind"),": global class",(0,l.kt)("br",{parentName:"p"}),"\n",(0,l.kt)("strong",{parentName:"p"},"Properties")),(0,l.kt)("table",null,(0,l.kt)("thead",{parentName:"table"},(0,l.kt)("tr",{parentName:"thead"},(0,l.kt)("th",{parentName:"tr",align:null},"Name"),(0,l.kt)("th",{parentName:"tr",align:null},"Type"),(0,l.kt)("th",{parentName:"tr",align:null},"Description"))),(0,l.kt)("tbody",{parentName:"table"},(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"username"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"a string that defines the user's accounts")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"password"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"a password for the user")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"[token]"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"an access token")))),(0,l.kt)("ul",null,(0,l.kt)("li",{parentName:"ul"},(0,l.kt)("a",{parentName:"li",href:"#User"},"User"),(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},(0,l.kt)("a",{parentName:"li",href:"#new_User_new"},"new User()")),(0,l.kt)("li",{parentName:"ul"},(0,l.kt)("a",{parentName:"li",href:"#User.authenticateMiddleware"},".authenticateMiddleware(req, res, next)")),(0,l.kt)("li",{parentName:"ul"},(0,l.kt)("a",{parentName:"li",href:"#User.authenticate"},".authenticate(token, username)")," \u21d2 ",(0,l.kt)("code",null,"Promise")),(0,l.kt)("li",{parentName:"ul"},(0,l.kt)("a",{parentName:"li",href:"#User.logout"},".logout(token, username)")," \u21d2 ",(0,l.kt)("code",null,"Promise")),(0,l.kt)("li",{parentName:"ul"},(0,l.kt)("a",{parentName:"li",href:"#User.login"},".login(username, password)")," \u21d2 ",(0,l.kt)("code",null,"Promise")),(0,l.kt)("li",{parentName:"ul"},(0,l.kt)("a",{parentName:"li",href:"#User.register"},".register(username, password)")," \u21d2 ",(0,l.kt)("code",null,"Promise"))))),(0,l.kt)("a",{name:"new_User_new"}),(0,l.kt)("h3",{id:"new-user"},"new User()"),(0,l.kt)("p",null,"User definition"),(0,l.kt)("a",{name:"User.authenticateMiddleware"}),(0,l.kt)("h3",{id:"userauthenticatemiddlewarereq-res-next"},"User.authenticateMiddleware(req, res, next)"),(0,l.kt)("p",null,"middleware to verify the username and token are valid, will then set the user to req.user"),(0,l.kt)("p",null,(0,l.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,l.kt)("a",{parentName:"p",href:"#User"},(0,l.kt)("code",null,"User"))),(0,l.kt)("table",null,(0,l.kt)("thead",{parentName:"table"},(0,l.kt)("tr",{parentName:"thead"},(0,l.kt)("th",{parentName:"tr",align:null},"Param"),(0,l.kt)("th",{parentName:"tr",align:null},"Type"),(0,l.kt)("th",{parentName:"tr",align:null},"Description"))),(0,l.kt)("tbody",{parentName:"table"},(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"req"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"Object")),(0,l.kt)("td",{parentName:"tr",align:null},"express request")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"res"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"Object")),(0,l.kt)("td",{parentName:"tr",align:null},"express response")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"next"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"function")),(0,l.kt)("td",{parentName:"tr",align:null},"callback to go to next middleware")))),(0,l.kt)("a",{name:"User.authenticate"}),(0,l.kt)("h3",{id:"userauthenticatetoken-username--promise"},"User.authenticate(token, username) \u21d2 ",(0,l.kt)("code",null,"Promise")),(0,l.kt)("p",null,"verify the username and token are valid"),(0,l.kt)("p",null,(0,l.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,l.kt)("a",{parentName:"p",href:"#User"},(0,l.kt)("code",null,"User"))),(0,l.kt)("table",null,(0,l.kt)("thead",{parentName:"table"},(0,l.kt)("tr",{parentName:"thead"},(0,l.kt)("th",{parentName:"tr",align:null},"Param"),(0,l.kt)("th",{parentName:"tr",align:null},"Type"),(0,l.kt)("th",{parentName:"tr",align:null},"Description"))),(0,l.kt)("tbody",{parentName:"table"},(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"token"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the token associated with the username")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"username"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the username of the user")))),(0,l.kt)("a",{name:"User.logout"}),(0,l.kt)("h3",{id:"userlogouttoken-username--promise"},"User.logout(token, username) \u21d2 ",(0,l.kt)("code",null,"Promise")),(0,l.kt)("p",null,"logs out a user by deleting their token"),(0,l.kt)("p",null,(0,l.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,l.kt)("a",{parentName:"p",href:"#User"},(0,l.kt)("code",null,"User"))),(0,l.kt)("table",null,(0,l.kt)("thead",{parentName:"table"},(0,l.kt)("tr",{parentName:"thead"},(0,l.kt)("th",{parentName:"tr",align:null},"Param"),(0,l.kt)("th",{parentName:"tr",align:null},"Type"),(0,l.kt)("th",{parentName:"tr",align:null},"Description"))),(0,l.kt)("tbody",{parentName:"table"},(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"token"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the token associated with the username")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"username"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the username of the user")))),(0,l.kt)("a",{name:"User.login"}),(0,l.kt)("h3",{id:"userloginusername-password--promise"},"User.login(username, password) \u21d2 ",(0,l.kt)("code",null,"Promise")),(0,l.kt)("p",null,"logs in a user and returns"),(0,l.kt)("p",null,(0,l.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,l.kt)("a",{parentName:"p",href:"#User"},(0,l.kt)("code",null,"User"))),(0,l.kt)("table",null,(0,l.kt)("thead",{parentName:"table"},(0,l.kt)("tr",{parentName:"thead"},(0,l.kt)("th",{parentName:"tr",align:null},"Param"),(0,l.kt)("th",{parentName:"tr",align:null},"Type"),(0,l.kt)("th",{parentName:"tr",align:null},"Description"))),(0,l.kt)("tbody",{parentName:"table"},(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"username"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the username of the user who is logging in")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"password"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the password associated with the user")))),(0,l.kt)("a",{name:"User.register"}),(0,l.kt)("h3",{id:"userregisterusername-password--promise"},"User.register(username, password) \u21d2 ",(0,l.kt)("code",null,"Promise")),(0,l.kt)("p",null,"registers a user"),(0,l.kt)("p",null,(0,l.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,l.kt)("a",{parentName:"p",href:"#User"},(0,l.kt)("code",null,"User"))),(0,l.kt)("table",null,(0,l.kt)("thead",{parentName:"table"},(0,l.kt)("tr",{parentName:"thead"},(0,l.kt)("th",{parentName:"tr",align:null},"Param"),(0,l.kt)("th",{parentName:"tr",align:null},"Type"),(0,l.kt)("th",{parentName:"tr",align:null},"Description"))),(0,l.kt)("tbody",{parentName:"table"},(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"username"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the username of the user who is logging in")),(0,l.kt)("tr",{parentName:"tbody"},(0,l.kt)("td",{parentName:"tr",align:null},"password"),(0,l.kt)("td",{parentName:"tr",align:null},(0,l.kt)("code",null,"String")),(0,l.kt)("td",{parentName:"tr",align:null},"the password associated with the user")))))}k.isMDXComponent=!0}}]);