
// The key to use when storing the cloudid.
var CLOUDID_KEY = 'cloudid';

/**
 * Gets the cloudid of the Jira site to operate against.
 * @param {OAuth.Service_} service The authorized service.
 * @returns {string} The cloudid of the site to operate on.
 */
function getCloudId(service) {
  const cloudid = service.getStorage().getValue(CLOUDID_KEY);
  if (cloudid) {
    return cloudid;
  }
  throw new Error('Site cloudid not found!');
}

//Returns the instance name
function getCloudSiteName(){
  const service = getService();
  const cloudId = getCloudId(service);
  const authorizedSites = getAuthorizedSites(service);

  for(const site of authorizedSites){
    if(site.id === cloudId){
      console.log(site.name);
      return site.name;
    }
  }
  throw new Error('No authorized site found with the stored cloudId!');
}

function getAllAccessibleInstanceNames() {

  var instances = [];
  var service = getService();
  var authorizedSites = getAuthorizedSites(service);

  for (var site = 0; site < authorizedSites.length; site++) {
    instances.push(authorizedSites[site]["name"]);
  }

  //console.log(instances);
  return instances;

}

function setCloudIDFromInstanceName(instanceName) {

  var service = getService();
  var authorizedSites = getAuthorizedSites(service);
  for (var site = 0; site < authorizedSites.length; site++) {
    if (instanceName == authorizedSites[site]["name"]) {
      saveCloudId(authorizedSites[site]["id"]);
      return;
    }
  }

}

function validateAndSaveCloudId(cloudId){
  let service = getService();
  // Get the sites the user has access to.
  var sites = getAuthorizedSites(service);
  for(const site of sites){
    if(site.id === cloudId){
      service.getStorage().setValue(CLOUDID_KEY, cloudId);
      return;
    }
  }
  throw new Error('No authorized site found with the received id!');
}

function saveCloudId(cloudId) {
  getService().getStorage().setValue(CLOUDID_KEY, cloudId);
}

/**
 * Reset the authorization state.
 */
function resetService() {
  getService().reset();
}

/**
 * Configures the service.
 */
function getService() {
  return OAuth2.createService('Jira')
      // Set the endpoint URLs.
      .setAuthorizationBaseUrl('https://auth.atlassian.com/authorize')
      .setTokenUrl('https://auth.atlassian.com/oauth/token')

      // Set the client ID and secret.
      .setClientId('IhG1qkSTktIbfOUHWKLQghq9phP5A4wF')
      .setClientSecret('O8z1QshBxHfC9I0AFHDmZBVvG1k2BsW2CA9ykVPG1QEsbb4Xqr9ZK5IUY3OZ0mfE')

      // Set the name of the callback function that should be invoked to
      // complete the OAuth flow.
      .setCallbackFunction('authCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())

      .setCache(CacheService.getUserCache())
      .setLock(LockService.getUserLock())

      // Set the scope and other paramaeters required by Atlassian.
      .setScope('read:jira-user read:jira-work write:jira-work manage:jira-configuration read:project:jira write:project:jira delete:project:jira write:field:jira read:avatar:jira read:field:jira read:project-category:jira read:field-configuration:jira delete:field:jira read:custom-field-contextual-configuration:jira read:issue:jira write:issue:jira write:issue:jira-software write:comment:jira write:comment.property:jira write:attachment:jira manage:jira-project read:screen:jira write:screen:jira offline_access')
      .setParam('audience', 'api.atlassian.com')
      .setParam('prompt', 'consent');
}

/**
 * Handles the OAuth callback.
 */
function authCallback(request) {

  var service = getService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    const cloudId = service.getStorage().getValue(CLOUDID_KEY);
    if(!cloudId){
      const sites = getAuthorizedSites(service);
      saveCloudId(sites[0].id);
    }
    //showSidebar('configuration');
    var htmlForSidebar = HtmlService.createTemplateFromFile("authorized");
    var htmlOutput = htmlForSidebar.evaluate();
    htmlOutput.setTitle("Custom field statistics");

    var ui = SpreadsheetApp.getUi();
    ui.showSidebar(htmlOutput);
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    showAddOn();
    return HtmlService.createHtmlOutput('Denied. You can close this tab.');
  }
}

function getAuthorizedSites(service) {
  const url = 'https://api.atlassian.com/oauth/token/accessible-resources';
  const response = UrlFetchApp.fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + service.getAccessToken()
    }
  });
  const result = JSON.parse(response.getContentText());
  return result;
}

/**
 * Logs the redict URI to register.
 */
function logRedirectUri() {
  Logger.log(OAuth2.getRedirectUri());
}

function showSidebar() {
  var service = getService();
  if (!service.hasAccess()) {
    var authorizationUrl = service.getAuthorizationUrl();
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Click on the link for authorization.');
    template.authorizationUrl = service.getAuthorizationUrl();
    var page = template.evaluate();
    SpreadsheetApp.getUi().showSidebar(page);
  } else {
    showPage("authorized");
  }
}
