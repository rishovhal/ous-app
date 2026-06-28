// ═══════════════════════════════════════════════════════════════════
// ONE UDAY SANGHA — Google Apps Script Backend
// Deploy this as a Web App to enable write operations
// ═══════════════════════════════════════════════════════════════════

var SHEET_ID = "1VAM7ajyEg7J99zbBScthfFkXyncdCZ29ceLSF6OZFqU";

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var tab    = body.tab;
    var ss     = SpreadsheetApp.openById(SHEET_ID);
    var sheet  = ss.getSheetByName(tab);

    if (!sheet) {
      return respond({ status: "error", message: "Tab not found: " + tab });
    }

    if (action === "append") {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var row = headers.map(function(h) {
        return body.row[h] !== undefined ? String(body.row[h]) : "";
      });
      sheet.appendRow(row);
      return respond({ status: "ok" });
    }

    if (action === "update") {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idCol = headers.indexOf("id");
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(body.id)) {
          var newRow = headers.map(function(h) {
            return body.row[h] !== undefined ? String(body.row[h]) : String(data[i][headers.indexOf(h)] || "");
          });
          sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
          return respond({ status: "ok" });
        }
      }
      return respond({ status: "error", message: "Row not found: " + body.id });
    }

    if (action === "delete") {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idCol = headers.indexOf("id");
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(body.id)) {
          sheet.deleteRow(i + 1);
          return respond({ status: "ok" });
        }
      }
      return respond({ status: "error", message: "Row not found: " + body.id });
    }

    return respond({ status: "error", message: "Unknown action: " + action });

  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  return respond({ status: "ok", message: "OUS Backend is running" });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
