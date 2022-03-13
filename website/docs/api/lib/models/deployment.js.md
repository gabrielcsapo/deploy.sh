<a name="Deployment"></a>

## Deployment
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | the container id |
| name | <code>String</code> | the name of the deployment |
| port | <code>Number</code> | the port that the container has exposed |
| subdomain | <code>String</code> | the subdomain of the application |
| directory | <code>String</code> | the directory of tared application |
| username | <code>String</code> | the username who owns the deployment |


* [Deployment](#Deployment)
    * [new Deployment()](#new_Deployment_new)
    * [.update(options)](#Deployment.update) ⇒ <code>Promise</code>
    * [.del(name)](#Deployment.del) ⇒ <code>Promise</code>
    * [.proxy(subdomain)](#Deployment.proxy) ⇒ <code>Promise</code>
    * [.decorate(deployment)](#Deployment.decorate) ⇒ <code>Promise</code>
    * [.get(options)](#Deployment.get) ⇒ <code>Promise</code>
    * [.getAll()](#Deployment.getAll) ⇒ <code>Promise</code>
    * [.start([name])](#Deployment.start) ⇒ <code>Promise</code>
    * [.stop([name])](#Deployment.stop) ⇒ <code>Promise</code>
    * [.logs(name, token, username)](#Deployment.logs) ⇒ <code>Promise</code>
    * [.remove(name)](#Deployment.remove) ⇒ <code>Promise</code>

<a name="new_Deployment_new"></a>

### new Deployment()
Deployment definition

<a name="Deployment.update"></a>

### Deployment.update(options) ⇒ <code>Promise</code>
updates a deployment

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> |  |
| options.name | <code>String</code> | the name of the deployment |
| options.username | <code>String</code> | the username associated with this deployment |

<a name="Deployment.del"></a>

### Deployment.del(name) ⇒ <code>Promise</code>
deletes the specified deployment from the user

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | the name of the deployment |
| options.token | <code>String</code> | the token for the user who owns the deployment |
| options.username | <code>String</code> | the username associated with this deployment |

<a name="Deployment.proxy"></a>

### Deployment.proxy(subdomain) ⇒ <code>Promise</code>
express middleware to proxy to correct container

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| subdomain | <code>String</code> | the subdomain for the application being requested |

<a name="Deployment.decorate"></a>

### Deployment.decorate(deployment) ⇒ <code>Promise</code>
decorates a deployment with the correct data on get

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| deployment | [<code>Deployment</code>](#Deployment) | a deployment instance |

<a name="Deployment.get"></a>

### Deployment.get(options) ⇒ <code>Promise</code>
gets a specific deployment for the specified user

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> |  |
| options.name | <code>String</code> | the name of the deployment |
| options.token | <code>String</code> | the token for the user who owns the deployment |
| options.username | <code>String</code> | the username associated with this deployment |
| option.create | <code>Boolean</code> | create a deployment if not found |

<a name="Deployment.getAll"></a>

### Deployment.getAll() ⇒ <code>Promise</code>
gets all deployments for the specified user

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| options.token | <code>String</code> | the token for the user who owns the deployment |
| options.username | <code>String</code> | the username associated with this deployment |

<a name="Deployment.start"></a>

### Deployment.start([name]) ⇒ <code>Promise</code>
starts a container or all containers

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| [name] | <code>String</code> | to start a specific container a name property is needed |
| options.token | <code>String</code> | the token for the user who owns the deployment |
| options.username | <code>String</code> | the username associated with this deployment |

<a name="Deployment.stop"></a>

### Deployment.stop([name]) ⇒ <code>Promise</code>
stops a container or all containers

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| [name] | <code>String</code> | to stop a specific container a name property is needed |
| [options.token] | <code>String</code> | the token for the user who owns the deployment |
| [options.username] | <code>String</code> | the username associated with this deployment |

<a name="Deployment.logs"></a>

### Deployment.logs(name, token, username) ⇒ <code>Promise</code>
retrieves from a given instance

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | instance name |
| token | <code>String</code> | the token for the user who owns the deployment |
| username | <code>String</code> | the username associated with this deployment |

<a name="Deployment.remove"></a>

### Deployment.remove(name) ⇒ <code>Promise</code>
removes a specific container, will stop and cleanup all necessary files

**Kind**: static method of [<code>Deployment</code>](#Deployment)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | the name of the container |
| options.token | <code>String</code> | the token for the user who owns the deployment |
| options.username | <code>String</code> | the username associated with this deployment |

