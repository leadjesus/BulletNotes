import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

import { Notes } from './notes.js';
import { Lists } from '../lists/lists.js';

export const insert = new ValidatedMethod({
  name: 'notes.insert',
  validate: Notes.simpleSchema().pick(['title']).validator({ clean: true, filter: false }),
  run({ title }) {
    const list = Lists.findOne(listId);

    if (list.isPrivate() && list.userId !== this.userId) {
      throw new Meteor.Error('notes.insert.accessDenied',
        'Cannot add notes to a private list that is not yours');
    }

    const note = {
      title,
      createdAt: new Date(),
    };

    Notes.insert(note);
  },
});

export const setCheckedStatus = new ValidatedMethod({
  name: 'notes.makeChecked',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    newCheckedStatus: Notes.simpleSchema().schema('checked'),
  }).validator({ clean: true, filter: false }),
  run({ noteId, newCheckedStatus }) {
    const note = Notes.findOne(noteId);

    if (note.checked === newCheckedStatus) {
      // The status is already what we want, let's not do any extra work
      return;
    }

    if (!note.editableBy(this.userId)) {
      throw new Meteor.Error('notes.setCheckedStatus.accessDenied',
        'Cannot edit checked status in a private list that is not yours');
    }

    Notes.update(noteId, { $set: {
      checked: newCheckedStatus,
    } });
  },
});

export const updateText = new ValidatedMethod({
  name: 'notes.updateText',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    newText: Notes.simpleSchema().schema('text'),
  }).validator({ clean: true, filter: false }),
  run({ noteId, newText }) {
    // This is complex auth stuff - perhaps denormalizing a userId onto notes
    // would be correct here?
    const note = Notes.findOne(noteId);

    if (!note.editableBy(this.userId)) {
      throw new Meteor.Error('notes.updateText.accessDenied',
        'Cannot edit notes in a private list that is not yours');
    }

    Notes.update(noteId, {
      $set: {
        text: (_.isUndefined(newText) ? null : newText),
      },
    });
  },
});

export const remove = new ValidatedMethod({
  name: 'notes.remove',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
  }).validator({ clean: true, filter: false }),
  run({ noteId }) {
    const note = Notes.findOne(noteId);

    if (!note.editableBy(this.userId)) {
      throw new Meteor.Error('notes.remove.accessDenied',
        'Cannot remove notes in a private list that is not yours');
    }

    Notes.remove(noteId);
  },
});

// Get list of all method names on Notes
const NOTES_METHODS = _.pluck([
  insert,
  setCheckedStatus,
  updateText,
  remove,
], 'name');

if (Meteor.isServer) {
  // Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(NOTES_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() { return true; },
  }, 5, 1000);
}
