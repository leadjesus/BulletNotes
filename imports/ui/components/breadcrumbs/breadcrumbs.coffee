{ Template } = require 'meteor/templating'
{ Notes } = require '../../../api/notes/notes.coffee'
require './breadcrumbs.jade'

Template.breadcrumbs.helpers
  parents: ->
    parents = []
    note = Template.instance().data.note()
    if note
      parent = Notes.findOne note.parent,
        fields:
          _id: yes
          parent: yes
          title: yes
      while parent
        parents.unshift parent
        parent = Notes.findOne parent.parent,
          fields:
            _id: yes
            parent: yes
            title: yes
    parents
  focusedTitle: ->
    note = Template.instance().data.note()
    if note
      emojione.shortnameToUnicode note.title
  title: ->
    emojione.shortnameToUnicode @title
  shareKey: ->
    FlowRouter.getParam 'shareKey'

Template.breadcrumbs.events
  "click a": (event, template) ->
    $('#searchForm input').val('')
