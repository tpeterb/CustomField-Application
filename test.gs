//-------------------------------------------------------------//
//---------------------Generating test data--------------------//
//-------------------------------------------------------------//

var generatedTestProjectsKeys = [];
var numberOfProjects = 3;

function generateTestProjects() {

  var service = getService();
    for (var i = 0; i < numberOfProjects; i++) {
      var tempProjectKey = generateProjectKey();
      var tempProjectName = generateProjectName();
      generatedTestProjectsKeys.push(tempProjectKey);
      data = {
          "key": tempProjectKey,
          "name": tempProjectName,
          "projectTypeKey": "software",
          "projectTemplateKey": "com.pyxis.greenhopper.jira:gh-simplified-kanban-classic",
          "leadAccountId": "62ac7d6afd38e70069b555c8"
      }
      const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/project", {
        "method": "POST",
        "headers": {
          "Authorization": "Bearer " + service.getAccessToken(),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        "payload": JSON.stringify(data)
      });
    }

}

var generatedTestCustomFields = [];
var numberOfCustomFieldsToGenerate = 3;

function generateTestCustomFields() {

  service = getService();
  var fieldTypes = [
    //"com.atlassian.jira.plugin.system.customfieldtypes:datepicker",
    //"com.atlassian.jira.plugin.system.customfieldtypes:float"
    //"com.atlassian.jira.plugin.system.customfieldtypes:labels",
    //"com.atlassian.jira.plugin.system.customfieldtypes:project",
    //"com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons",
    "com.atlassian.jira.plugin.system.customfieldtypes:readonlyfield",
    //"com.atlassian.jira.plugin.system.customfieldtypes:select",
    //"com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes",
    //"com.atlassian.jira.plugin.system.customfieldtypes:textfield",
    //"com.atlassian.jira.plugin.system.customfieldtypes:url"
  ];


  for (var i = 0; i < numberOfCustomFieldsToGenerate; i++) {
    var customFieldName = generateCustomFieldName();
    generatedTestCustomFields.push(customFieldName);
    data = {
    "name": customFieldName,
    "type": fieldTypes[Math.floor(Math.random() * fieldTypes.length)]
    };
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/field", {
    "method": "POST",
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken(),
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(data)
    });
  }

}

function modifyTestCustomFieldContexts() {

  service = getService();
  getProjects();
  getCustomFields();

  for (var i = 0; i < generatedTestCustomFields.length; i++) {
    const customFieldID = getGeneratedCustomFieldIDByName(generatedTestCustomFields[i]);
    const customFieldContext = getContextIDByCustomFieldID(customFieldID);
    const numberOfProjectsToInvolve = Math.floor(Math.random() * generatedTestProjectsKeys.length) + 1;
    var chosenProjects = chooseProjectIDs(numberOfProjectsToInvolve);
    data = {
      "projectIds": chosenProjects
    };
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/field/" + customFieldID + "/context/" + customFieldContext + "/project", {
    "method": "PUT",
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken(),
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(data)
    });
  }

}

function generateTestIssues() {

  var service = getService();

  //Updating the custom field contexts
  
  getCustomFieldContexts();

  //Collecting the generated customFieldIDs

  var customFieldIDs = [];
  for (var i = 0; i < generatedTestCustomFields.length; i++) {
    customFieldIDs.push(getGeneratedCustomFieldIDByName(generatedTestCustomFields[i]));
  }

  //Adding the generated custom fields to the screen tab of the custom screen

  for (var i = 0; i < customFieldIDs.length; i++) {
    addCustomFieldToCustomScreenTab(customFieldIDs[i]);
  }

  //Adding the summary field to the screen tab of the custom screen

  if (!customScreenTabContainsField("summary")) {
    addCustomFieldToCustomScreenTab("summary");
  }

  //Creating the issues

  const maximumNumberOfIssuesToCreate = 4;

  for (var projectKey = 0; projectKey < generatedTestProjectsKeys.length; projectKey++) {

    //var projectID = getProjectIDByKey(generatedTestProjectsKeys[projectKey]);
    //console.log("projectID = " + projectID);

    //Assigning the previously created custom issue type screen scheme to the project

    assignCustomIssueTypeScreenSchemeToProject(getProjectIDByKey(generatedTestProjectsKeys[projectKey]));

    //Creating the issues

    var numberOfIssuesToCreate = Math.floor(Math.random() * maximumNumberOfIssuesToCreate) + 1;

    //Getting the custom field IDs on context of the project

    const customFieldIDsInContextOfProject = getCustomFieldIDsInContextOfProject(getProjectIDByKey(generatedTestProjectsKeys[projectKey]));

    //Adding the chosen custom fields to the issues being created

    for (var issue = 0; issue < numberOfIssuesToCreate; issue++) {
      var numberOfFieldsToFill = Math.floor(Math.random() * customFieldIDsInContextOfProject.length) + 1;
      var chosenCustomFieldIDs = chooseCustomFieldIDs(numberOfFieldsToFill, customFieldIDsInContextOfProject);
      data = {
        "update": {},
        "fields": {
          "summary": Utilities.getUuid(),
          "issuetype": {
            "id": "10002"
          },
          "project": {
            "key": generatedTestProjectsKeys[projectKey]
          }
        }
      };
      for (var customFieldId = 0; customFieldId < numberOfFieldsToFill; customFieldId++) {
        data["fields"][chosenCustomFieldIDs[customFieldId]] = Utilities.getUuid().substring(0,8);
      }
      const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/issue", {
        "method": "POST",
        "headers": {
          "Authorization": "Bearer " + service.getAccessToken(),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        "payload": JSON.stringify(data),
        muteHttpExceptions: true
      });
      console.log(response.getContentText());
    }
  }

}

function generateEvaluateAndDeleteTestData() {

  //Generating test projects
  generateTestProjects();

  //Generating custom fields
  generateTestCustomFields();

  //Modifying custom field contexts
  modifyTestCustomFieldContexts();

  //Creating a separate screen for the generated test projects

  generateCustomScreen();

  //Creating a separate screen scheme for the generated projects

  generateCustomScreenScheme();

  //Creating a separate issue type screen scheme for the generated projects

  generateCustomIssueTypeScreenScheme();

  //Generating test issues
  generateTestIssues();

  //Filling the sheet
  getProjects(); //To refresh the total issue counts after the creation of the test issues
  getIssues();
  populateSheet();

  //Deleting the test data
  deleteTestDataInstantly();
  
}

function generateTestData() {

  //Generating test projects
  generateTestProjects();

  //Generating custom fields
  generateTestCustomFields();

  //Modifying custom field contexts
  modifyTestCustomFieldContexts();

  //Creating a separate screen for the generated test projects

  generateCustomScreen();

  //Creating a separate screen scheme for the generated projects

  generateCustomScreenScheme();

  //Creating a separate issue type screen scheme for the generated projects

  generateCustomIssueTypeScreenScheme();

  //Generating test issues
  generateTestIssues();

}

function deleteTestProjectsInstantly() {

  var service = getService();
    for (var i = 0; i < generatedTestProjectsKeys.length; i++) {
      const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/project/" + generatedTestProjectsKeys[i], {
        "method": "DELETE",
        "headers": {
          "Authorization": "Bearer " + service.getAccessToken()
        }
      });
    }

}

function deleteTestProjects() {

  var service = getService();

  getProjects();

  for (var project = 0; project < projects.length; project++) {
    if (projects[project]["key"].substring(0, 3) == "CFA" &&
        projects[project]["name"].length >= 19 &&
        projects[project]["name"].substring(0, 19) == "CustomFieldAppTest-") {
          const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/project/" + projects[project]["key"], {
        "method": "DELETE",
        "headers": {
          "Authorization": "Bearer " + service.getAccessToken()
        }
      });
    }
  }

}

/*function deleteTestCustomFieldsInstantly() {

  var service = getService();
  getCustomFields();
  for (var i = 0; i < generatedTestCustomFields.length; i++) {
    for (var j = 0; j < customFields.length; j++) {
      if (customFields[j]["name"] == generatedTestCustomFields[i]) {
        const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/field/" + customFields[j]["id"], {
          "method": "DELETE",
          "headers": {
            "Authorization": "Bearer " + service.getAccessToken()
          }
        });
      }
    }
  }

}*/

function deleteTestCustomFields() {

  var service = getService();

  getCustomFields();

  for (var customField = 0; customField < customFields.length; customField++) {
    if (customFields[customField]["name"].length >= 14 &&
        customFields[customField]["name"].substring(0, 14) == "CFA-TestField-") {
      const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/field/" + customFields[customField]["id"], {
        "method": "DELETE",
        "headers": {
          "Authorization": "Bearer " + service.getAccessToken()
        }
      });
    }
  }

}

function deleteCustomScreen() {

  var service = getService();

  const customScreenID = getCustomScreenID();

  if (customScreenID != undefined) {
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screens/" + customScreenID, {
      "method": "DELETE",
      "headers": {
        "Authorization": "Bearer " + service.getAccessToken()
      }
    });
  }

}

function deleteCustomScreenScheme() {

  var service = getService();

  const customScreenSchemeID = getCustomScreenSchemeID();

  if (customScreenSchemeID != undefined) {
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screenscheme/" + customScreenSchemeID, {
      "method": "DELETE",
      "headers": {
        "Authorization": "Bearer " + service.getAccessToken()
      }
    });
  }

}

function deleteCustomIssueTypeScreenScheme() {

  var service = getService();

  const customIssueTypeScreenSchemeID = getCustomIssueTypeScreenSchemeID();

  if (customIssueTypeScreenSchemeID != undefined) {
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/issuetypescreenscheme/" + customIssueTypeScreenSchemeID, {
      "method": "DELETE",
      "headers": {
        "Authorization": "Bearer " + service.getAccessToken(),
        'Accept': 'application/json'
      }
    });
  }

}

function deleteTestData() {

  //Deleting custom fields
  deleteTestCustomFields();

  //Deleting test projects
  deleteTestProjects();

  //Deleting the custom issue type screen scheme
  deleteCustomIssueTypeScreenScheme();

  //Deleting the custom screen scheme
  deleteCustomScreenScheme();

  //Deleting the custom screen
  deleteCustomScreen();

}

function deleteTestDataInstantly() {
  
  //Deleting custom fields
  deleteTestCustomFields();

  //Deleting test projects
  deleteTestProjectsInstantly();

  //Deleting the custom issue type screen scheme
  deleteCustomIssueTypeScreenScheme();

  //Deleting the custom screen scheme
  deleteCustomScreenScheme();

  //Deleting the custom screen
  deleteCustomScreen();

}

function generateProjectKey() {
  return ("CFA" + Utilities.getUuid().toUpperCase().substring(0, 7));
}

function generateProjectName() {
  return "CustomFieldAppTest-" + Utilities.getUuid().substring(0, 4);
}

function generateCustomFieldName() {
 return "CFA-TestField-" + Utilities.getUuid().substring(0, 8);
}

function generateCustomScreen() {

  var service = getService();

  if (getCustomScreenID() == undefined) {
    var screenData = {
    "name": "CustomFieldApp Test Screen"
    };

    const customScreenResponse = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screens", {
      "method": "POST",
      "headers": {
        "Authorization": "Bearer " + service.getAccessToken(),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(screenData)
    });
  }

}

function generateCustomScreenScheme() {

  var service = getService();

  if (getCustomScreenSchemeID() == undefined) {
    
    //Obtaining the ID of the previously created custom screen

    var customScreenID = getCustomScreenID();

    //Creating the custom screen scheme

    var screenSchemeData = {
    "name": "CustomFieldApp Test Screen Scheme",
    "screens": {
      "default": customScreenID,
      "view": customScreenID,
      "edit": customScreenID
    }
  };

    const customScreenSchemeResponse = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screenscheme", {
      "method": "POST",
      "headers": {
        "Authorization": "Bearer " + service.getAccessToken(),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(screenSchemeData)
    });
  }

}

function generateCustomIssueTypeScreenScheme() {

  var service = getService();

  if (getCustomIssueTypeScreenSchemeID() == undefined) {

  //Obtaining the ID of the previously created screen scheme

    var customScreenSchemeID = getCustomScreenSchemeID();

    //Creating the issue type screen scheme

    var issueTypeScreenSchemeData = {
    "name": "CustomFieldApp Test Issue Type Screen Scheme",
    "issueTypeMappings": [
      {
      "issueTypeId": "default",
      "screenSchemeId": customScreenSchemeID
      }
    ]
  };

    const customIssueTypeScreenSchemeResponse = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/issuetypescreenscheme", {
      "method": "POST",
      "headers": {
        "Authorization": "Bearer " + service.getAccessToken(),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(issueTypeScreenSchemeData)
    });
  }

}

function assignCustomIssueTypeScreenSchemeToProject(projectID) {

  var service = getService();

  var issueTypeAssigningData = {
    "issueTypeScreenSchemeId": getCustomIssueTypeScreenSchemeID(),
    "projectId": projectID
  };

  const assignResponse = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/issuetypescreenscheme/project", {
    "method": "PUT",
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken(),
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(issueTypeAssigningData)
  });

}

function getGeneratedCustomFieldIDByName(generatedTestCustomFieldName) {
  for (var i = 0; i < customFields.length; i++) {
    if (customFields[i]["name"] == generatedTestCustomFieldName) {
      return customFields[i]["id"];
    }
  }
}

function getContextIDByCustomFieldID(generatedCustomFieldID) {
  
  var service = getService();
  const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/field/" + generatedCustomFieldID + "/context", {
    "method": "GET",
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken(),
      "Accept": "application/json"
    }
  });
  const parsedResponse = JSON.parse(response.getContentText());
  return parsedResponse["values"][0]["id"];
}

function chooseProjectIDs(numberOfProjects) {
  const nums = new Set();
  while(nums.size !== numberOfProjects) {
    nums.add(Math.floor(Math.random() * generatedTestProjectsKeys.length));
  }
  var indexes = [];
  nums.forEach(element => {
    indexes.push(element);
  });
  var projectIDs = [];
  for (var i = 0; i < indexes.length; i++) {
    for (var j = 0; j < projects.length; j++) {
      /*console.log("Projects[j]['key'] = " + projects[j]["key"]);
      console.log("generatedTestProjectsKeys[nums[i]] = " + generatedTestProjectsKeys[indexes[i]]);*/
      if (projects[j]["key"] == generatedTestProjectsKeys[indexes[i]]) {
        projectIDs.push(projects[j]["id"]);
        break;
      }
    }
  }
  return projectIDs;
}

function chooseCustomFieldIDs(numberOfCustomFields, customFieldIDsInContextOfProject) {

  const nums = new Set();
  while(nums.size !== numberOfCustomFields) {
    nums.add(Math.floor(Math.random() * customFieldIDsInContextOfProject.length));
  }
  var indexes = [];
  nums.forEach(element => {
    indexes.push(element);
  });

  var customFieldIDs = [];
  for (var i = 0; i < indexes.length; i++) {
    customFieldIDs.push(customFieldIDsInContextOfProject[indexes[i]]);
  }
  return customFieldIDs;

}

function getProjectIDByKey(projectKey) {
  for (var i = 0; i < projects.length; i++) {
    if (projects[i]["key"] == projectKey) {
      return projects[i]["id"];
    }
  }
}

function getCustomScreenID() {

  var service = getService();

  var found = false, receivedAllScreens = false;
  var startAt = 0, maxResults = 100;
  var id;
  while(!found && !receivedAllScreens) {
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screens?startAt=" + startAt + "&maxResults=" + maxResults, {
      "method": "GET",
      "headers": {
        "Authorization": "Bearer " + service.getAccessToken(),
        'Accept': 'application/json'
      }
    });
    const parsedResponse = JSON.parse(response.getContentText());
    const screens = parsedResponse.values;
    if (screens.length > 0) {
      screens.forEach(screen => {
        if (screen["name"] == "CustomFieldApp Test Screen") {
          found = true;
          id = screen["id"];
          return id;
        }
      })
      startAt += maxResults;
    } else {
      receivedAllScreens = true;
    }
  }
  return id;

}

function getCustomScreenSchemeID() {

  var service = getService();

  var customScreenSchemeID;

  var startAt = 0, maxResults = 25;
  var found = false, receivedAllScreenSchemes = false;
  while (!found && !receivedAllScreenSchemes) {
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screenscheme?startAt=" + startAt + "&maxResults=" + maxResults, {
        "method": "GET",
        "headers": {
          "Authorization": "Bearer " + service.getAccessToken(),
          'Accept': 'application/json'
        }
      });
    const parsedResponse = JSON.parse(response.getContentText());
    const screenSchemes = parsedResponse.values;
    if (screenSchemes.length > 0) {
      screenSchemes.forEach(screenScheme => {
        if (screenScheme["name"] == "CustomFieldApp Test Screen Scheme") {
          found = true;
          customScreenSchemeID = screenScheme["id"];
          return customScreenSchemeID;
        }
      })
      startAt += maxResults;
    } else {
      receivedAllScreenSchemes = true;
    }
  }
  return customScreenSchemeID;

}

function getCustomIssueTypeScreenSchemeID() {

  var service = getService();

  var issueTypeScreenSchemeID;

  var startAt = 0, maxResults = 50;
  var found = false, receivedAllIssueTypeScreenSchemes = false;
  while (!found && !receivedAllIssueTypeScreenSchemes) {
    const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/issuetypescreenscheme?startAt=" + startAt + "&maxResults=" + maxResults, {
        "method": "GET",
        "headers": {
          "Authorization": "Bearer " + service.getAccessToken(),
          'Accept': 'application/json'
        }
      });
    const parsedResponse = JSON.parse(response.getContentText());
    const issueTypeScreenSchemes = parsedResponse.values;
    if (issueTypeScreenSchemes.length > 0) {
      issueTypeScreenSchemes.forEach(issueTypeScreenScheme => {
        if (issueTypeScreenScheme["name"] == "CustomFieldApp Test Issue Type Screen Scheme") {
          found = true;
          issueTypeScreenSchemeID = issueTypeScreenScheme["id"];
          return issueTypeScreenSchemeID;
        }
      })
      startAt += maxResults;
    } else {
      receivedAllIssueTypeScreenSchemes = true;
    }
  }
  return issueTypeScreenSchemeID;

}

function getCustomScreenTabID() {

  var service = getService();

  const customScreenID = getCustomScreenID();

  const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screens/" + customScreenID + "/tabs", {
    "method": "GET",
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken(),
      'Accept': 'application/json'
    }
  });

  const parsedResponse = JSON.parse(response.getContentText());
  var customScreenTabID = parsedResponse[0]["id"];
  return customScreenTabID;

}

function getCustomFieldIDsInContextOfProject(projectID) {

  var service = getService();

  var customFieldIDs = [];

  for (var context = 0; context < customFieldContexts.length; context++) {
    for (var contextObject = 0; contextObject < customFieldContexts[context].length; contextObject++) {
      if (customFieldContexts[context][contextObject]["projectId"] != undefined &&
          customFieldContexts[context][contextObject]["projectId"] == projectID) {
            customFieldIDs.push(customFieldContexts[context][customFieldContexts[context].length - 1]["fieldID"]);
      }
    }
  }

  return customFieldIDs;

}

function addCustomFieldToCustomScreenTab(customFieldID) {

  var service = getService();

  const customScreenID = getCustomScreenID();

  const customScreenTabID = getCustomScreenTabID();

  var data = {
    "fieldId": customFieldID
  };

  const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screens/" + customScreenID + "/tabs/" + customScreenTabID + "/fields", {
    "method": "POST",
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken(),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    "payload": JSON.stringify(data)
  });

}

function customScreenTabContainsField(fieldID) {

  var service = getService();

  const response = UrlFetchApp.fetch("https://api.atlassian.com/ex/jira/" + getCloudId(service) + "/rest/api/3/screens/" + getCustomScreenID() + "/tabs/" + getCustomScreenTabID()  + "/fields", {
    "method": "GET",
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken(),
      'Accept': 'application/json'
    }
  });

  const parsedResponse = JSON.parse(response.getContentText());
  var counter = 0;
  for (var field = 0; field < parsedResponse.length; field++) {
    if (parsedResponse[field]["id"] == fieldID) {
      counter++;
      break;
    }
  }
  if (counter == 0) {
    return false;
  } else {
    return true;
  }

}
