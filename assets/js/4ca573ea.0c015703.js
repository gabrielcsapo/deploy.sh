"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[96],{3905:function(t,e,n){n.d(e,{Zo:function(){return d},kt:function(){return s}});var a=n(7294);function l(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function r(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);e&&(a=a.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,a)}return n}function o(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?r(Object(n),!0).forEach((function(e){l(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):r(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function p(t,e){if(null==t)return{};var n,a,l=function(t,e){if(null==t)return{};var n,a,l={},r=Object.keys(t);for(a=0;a<r.length;a++)n=r[a],e.indexOf(n)>=0||(l[n]=t[n]);return l}(t,e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);for(a=0;a<r.length;a++)n=r[a],e.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(t,n)&&(l[n]=t[n])}return l}var m=a.createContext({}),i=function(t){var e=a.useContext(m),n=e;return t&&(n="function"==typeof t?t(e):o(o({},e),t)),n},d=function(t){var e=i(t.components);return a.createElement(m.Provider,{value:e},t.children)},k={inlineCode:"code",wrapper:function(t){var e=t.children;return a.createElement(a.Fragment,{},e)}},u=a.forwardRef((function(t,e){var n=t.components,l=t.mdxType,r=t.originalType,m=t.parentName,d=p(t,["components","mdxType","originalType","parentName"]),u=i(n),s=l,c=u["".concat(m,".").concat(s)]||u[s]||k[s]||r;return n?a.createElement(c,o(o({ref:e},d),{},{components:n})):a.createElement(c,o({ref:e},d))}));function s(t,e){var n=arguments,l=e&&e.mdxType;if("string"==typeof t||l){var r=n.length,o=new Array(r);o[0]=u;var p={};for(var m in e)hasOwnProperty.call(e,m)&&(p[m]=e[m]);p.originalType=t,p.mdxType="string"==typeof t?t:l,o[1]=p;for(var i=2;i<r;i++)o[i]=n[i];return a.createElement.apply(null,o)}return a.createElement.apply(null,n)}u.displayName="MDXCreateElement"},3525:function(t,e,n){n.r(e),n.d(e,{assets:function(){return d},contentTitle:function(){return m},default:function(){return s},frontMatter:function(){return p},metadata:function(){return i},toc:function(){return k}});var a=n(7462),l=n(3366),r=(n(7294),n(3905)),o=["components"],p={},m=void 0,i={unversionedId:"api/lib/models/deployment.js",id:"api/lib/models/deployment.js",title:"deployment.js",description:"Deployment",source:"@site/docs/api/lib/models/deployment.js.md",sourceDirName:"api/lib/models",slug:"/api/lib/models/deployment.js",permalink:"/deploy.sh/docs/api/lib/models/deployment.js",editUrl:"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/docs/api/lib/models/deployment.js.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"util.js",permalink:"/deploy.sh/docs/api/lib/helpers/util.js"},next:{title:"request.js",permalink:"/deploy.sh/docs/api/lib/models/request.js"}},d={},k=[{value:"Deployment",id:"deployment",level:2},{value:"new Deployment()",id:"new-deployment",level:3},{value:"Deployment.update(options) \u21d2 <code>Promise</code>",id:"deploymentupdateoptions--promise",level:3},{value:"Deployment.del(name) \u21d2 <code>Promise</code>",id:"deploymentdelname--promise",level:3},{value:"Deployment.proxy(subdomain) \u21d2 <code>Promise</code>",id:"deploymentproxysubdomain--promise",level:3},{value:"Deployment.decorate(deployment) \u21d2 <code>Promise</code>",id:"deploymentdecoratedeployment--promise",level:3},{value:"Deployment.get(options) \u21d2 <code>Promise</code>",id:"deploymentgetoptions--promise",level:3},{value:"Deployment.getAll() \u21d2 <code>Promise</code>",id:"deploymentgetall--promise",level:3},{value:"Deployment.start(name) \u21d2 <code>Promise</code>",id:"deploymentstartname--promise",level:3},{value:"Deployment.stop(name) \u21d2 <code>Promise</code>",id:"deploymentstopname--promise",level:3},{value:"Deployment.logs(name, token, username) \u21d2 <code>Promise</code>",id:"deploymentlogsname-token-username--promise",level:3},{value:"Deployment.remove(name) \u21d2 <code>Promise</code>",id:"deploymentremovename--promise",level:3}],u={toc:k};function s(t){var e=t.components,n=(0,l.Z)(t,o);return(0,r.kt)("wrapper",(0,a.Z)({},u,n,{components:e,mdxType:"MDXLayout"}),(0,r.kt)("a",{name:"Deployment"}),(0,r.kt)("h2",{id:"deployment"},"Deployment"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": global class",(0,r.kt)("br",{parentName:"p"}),"\n",(0,r.kt)("strong",{parentName:"p"},"Properties")),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Name"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"id"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the container id")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"name"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the name of the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"port"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"Number")),(0,r.kt)("td",{parentName:"tr",align:null},"the port that the container has exposed")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"subdomain"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the subdomain of the application")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"directory"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the directory of tared application")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username who owns the deployment")))),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment"},"Deployment"),(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#new_Deployment_new"},"new Deployment()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.update"},".update(options)")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.del"},".del(name)")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.proxy"},".proxy(subdomain)")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.decorate"},".decorate(deployment)")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.get"},".get(options)")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.getAll"},".getAll()")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.start"},".start([name])")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.stop"},".stop([name])")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.logs"},".logs(name, token, username)")," \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"#Deployment.remove"},".remove(name)")," \u21d2 ",(0,r.kt)("code",null,"Promise"))))),(0,r.kt)("a",{name:"new_Deployment_new"}),(0,r.kt)("h3",{id:"new-deployment"},"new Deployment()"),(0,r.kt)("p",null,"Deployment definition"),(0,r.kt)("a",{name:"Deployment.update"}),(0,r.kt)("h3",{id:"deploymentupdateoptions--promise"},"Deployment.update(options) \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"updates a deployment"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"Object")),(0,r.kt)("td",{parentName:"tr",align:null})),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.name"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the name of the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")))),(0,r.kt)("a",{name:"Deployment.del"}),(0,r.kt)("h3",{id:"deploymentdelname--promise"},"Deployment.del(name) \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"deletes the specified deployment from the user"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"name"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the name of the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.token"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the token for the user who owns the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")))),(0,r.kt)("a",{name:"Deployment.proxy"}),(0,r.kt)("h3",{id:"deploymentproxysubdomain--promise"},"Deployment.proxy(subdomain) \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"express middleware to proxy to correct container"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"subdomain"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the subdomain for the application being requested")))),(0,r.kt)("a",{name:"Deployment.decorate"}),(0,r.kt)("h3",{id:"deploymentdecoratedeployment--promise"},"Deployment.decorate(deployment) \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"decorates a deployment with the correct data on get"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"deployment"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("td",{parentName:"tr",align:null},"a deployment instance")))),(0,r.kt)("a",{name:"Deployment.get"}),(0,r.kt)("h3",{id:"deploymentgetoptions--promise"},"Deployment.get(options) \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"gets a specific deployment for the specified user"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"Object")),(0,r.kt)("td",{parentName:"tr",align:null})),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.name"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the name of the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.token"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the token for the user who owns the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"option.create"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"Boolean")),(0,r.kt)("td",{parentName:"tr",align:null},"create a deployment if not found")))),(0,r.kt)("a",{name:"Deployment.getAll"}),(0,r.kt)("h3",{id:"deploymentgetall--promise"},"Deployment.getAll() \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"gets all deployments for the specified user"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.token"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the token for the user who owns the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")))),(0,r.kt)("a",{name:"Deployment.start"}),(0,r.kt)("h3",{id:"deploymentstartname--promise"},"Deployment.start(","[name]",") \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"starts a container or all containers"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"[name]"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"to start a specific container a name property is needed")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.token"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the token for the user who owns the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")))),(0,r.kt)("a",{name:"Deployment.stop"}),(0,r.kt)("h3",{id:"deploymentstopname--promise"},"Deployment.stop(","[name]",") \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"stops a container or all containers"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"[name]"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"to stop a specific container a name property is needed")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"[options.token]"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the token for the user who owns the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"[options.username]"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")))),(0,r.kt)("a",{name:"Deployment.logs"}),(0,r.kt)("h3",{id:"deploymentlogsname-token-username--promise"},"Deployment.logs(name, token, username) \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"retrieves from a given instance"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"name"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"instance name")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"token"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the token for the user who owns the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")))),(0,r.kt)("a",{name:"Deployment.remove"}),(0,r.kt)("h3",{id:"deploymentremovename--promise"},"Deployment.remove(name) \u21d2 ",(0,r.kt)("code",null,"Promise")),(0,r.kt)("p",null,"removes a specific container, will stop and cleanup all necessary files"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Kind"),": static method of ",(0,r.kt)("a",{parentName:"p",href:"#Deployment"},(0,r.kt)("code",null,"Deployment"))),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Param"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"name"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the name of the container")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.token"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the token for the user who owns the deployment")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"options.username"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("code",null,"String")),(0,r.kt)("td",{parentName:"tr",align:null},"the username associated with this deployment")))))}s.isMDXComponent=!0}}]);