function onOpen() {

  var ui = SpreadsheetApp.getUi();
  ui.createAddonMenu()
    .addItem("Open", "showAddOn")
    .addToUi();

}

var projects = [];
var customFields = [];
var customFieldContexts = [];
var issues = [];

function makeRequest() {

  var service = getService();
  getProjects();
  getCustomFields();
  getCustomFieldContexts();
  getIssues();
  populateSheet();

}

function getProjects() {

  var service = getService();
  projects = [];
  var projectContainer = [];
  var startAt = 0, maxResults = 50;
  var receivedAllProjects = false;
  while(!receivedAllProjects) {
    projectContainer = [];
    const projectResponse = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/project/search?expand=insight&startAt=" + startAt + "&maxResults=" + maxResults, {
      "method": "GET",
      "headers": {
        "Accept": "application/json",
        "Authorization": "Bearer " + service.getAccessToken()
      }
    });

    var parsedProjects = JSON.parse(projectResponse);
    projectContainer = parsedProjects.values;
    if (projectContainer.length > 0) {
      projectContainer.forEach(project => {
        projects.push(project);
      });
      startAt += maxResults;
    } else {
      receivedAllProjects = true;
    }
  }
  
  //console.log(projects);
  /*projects.forEach(function(e) {
    console.log(e);
  });*/

}

function getCustomFields() {

  var service = getService();
  customFields = [];
  const customFieldsResponse = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) +  "/rest/api/3/field", {
    "method": "GET",
    "headers": {
      "Accept": "application/json",
      "Authorization": "Bearer " + service.getAccessToken()
    }
  });

  parsedCustomFields = JSON.parse(customFieldsResponse);
  parsedCustomFields.forEach(function(e) {
    if (e.custom == true) {
      customFields.push(e);
    }
  });

  /*customFields.forEach(function(e) {
    console.log(e);
  });*/

}

function getIssues() {

  var service = getService();
  issues = [];
  for (var i = 0; i < projects.length; i++) {
      projectKey = projects[i].key;
      var projectIssuesResponse = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) +  "/rest/api/2/search?jql=project=" + projectKey + "&maxResults=1000", {
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + service.getAccessToken()
        }
      });
      var parsedIssues = JSON.parse(projectIssuesResponse);
      /*parsedIssues.issues.push({
        "projectKey": projectKey
      });*/
      //console.log(parsedIssues.issues);
      issues.push(parsedIssues.issues);
    }

    /*issues.forEach(function(e) {
      console.log(e);
    });*/

}

function getCustomFieldContexts() {

  // url: 'https://your-domain.atlassian.net/rest/api/3/field/{fieldId}/context/projectmapping'

  var service = getService();

  customFieldContexts = [];

  for (var i = 0; i < customFields.length; i++) {
      var tempID = customFields[i].id;
      var tempURL = "https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/field/" + tempID + "/context/projectmapping";
      var fieldContextResponse = UrlFetchApp.fetch(tempURL, {
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + service.getAccessToken()
        }
      });
      var parsedContextResponse = JSON.parse(fieldContextResponse);
      var fieldObject = {
        "fieldID": tempID
      };
      parsedContextResponse.values.push(fieldObject);
      customFieldContexts.push(parsedContextResponse.values);
  }

  /*customFieldContexts.forEach(function(e) {
    console.log(e);
  });*/

}

function populateSheet() {
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("Results");
  if (sheet != null) {
        spreadsheet.deleteSheet(sheet);
    }

  sheet = spreadsheet.insertSheet();
  sheet.setName("Results");
  var range = sheet.getRange("A1:D1");
  range.setValues([["Project", "CustomField", "Not null", "No issues"]]);

  var rowNumber = 1;
  var rowContent = [];

  for (var project = 0; project < projects.length; project++) {
    var projectID = projects[project].id;
    for (var customFieldContext = 0; customFieldContext < customFieldContexts.length; customFieldContext++) {
      for (var contextObject = 0; contextObject < customFieldContexts[customFieldContext].length - 1; contextObject++) {
        if (customFieldContexts[customFieldContext][contextObject].projectId != undefined && customFieldContexts[customFieldContext][contextObject].projectId == projectID) {
          rowContent[0] = projects[project].key;
          customFieldID = -1;
          for (var customField = 0; customField < customFields.length; customField++) {
            if (customFields[customField].id == customFieldContexts[customFieldContext][customFieldContexts[customFieldContext].length - 1].fieldID) {
              customFieldID = customFields[customField].id;
              rowContent[1] = customFields[customField].name;
              break;
            }
          }
          var issueCounter = 0;
          for (var issue = 0; issue < issues.length; issue++) {
            //console.log(issues[issue]);
            if (issues[issue].length == 0) {
              continue;
            }
            if (issues[issue][0].key.substring(0, projects[project].key.length) != projects[project].key) {
              continue;
            }
            for (var issueObject = 0; issueObject < issues[issue].length; issueObject++) {
              if (issues[issue][issueObject].fields[customFieldID] != undefined && issues[issue][issueObject].fields[customFieldID] != null) {
                //console.log("Feltétel teljesült! :D");
                issueCounter++;
              }
            }
            rowContent[2] = issueCounter;
          }
          rowContent[2] = issueCounter;
          rowContent[3] = projects[project].insight.totalIssueCount;
          rowNumber++;
          range = sheet.getRange(rowNumber, 1, 1, 4);
          range.setValues([rowContent]);
          rowContent = [];
        }
      }
    }
  }
}

function showAddOn() {
  
  var htmlForSidebar = HtmlService.createTemplateFromFile("start");
  var htmlOutput = htmlForSidebar.evaluate();
  htmlOutput.setTitle("Custom field statistics");

  var ui = SpreadsheetApp.getUi();
  ui.showSidebar(htmlOutput);

}

function showPage(page) {
  var htmlForSidebar = HtmlService.createTemplateFromFile(page);
  var htmlOutput = htmlForSidebar.evaluate();
  htmlOutput.setTitle("Custom field statistics");

  var ui = SpreadsheetApp.getUi();
  ui.showSidebar(htmlOutput);
}
