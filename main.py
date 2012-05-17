#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import util
from django.utils import simplejson as json
from google.appengine.api import urlfetch

import urllib
import datetime
import base64
import logging
import config


class Work(db.Model):
  jsondata = db.TextProperty()
  hashdata = db.StringProperty() 
  midstate = db.StringProperty()
  hash1 = db.StringProperty()
  target = db.StringProperty()
  golden_ticket = db.StringProperty()
  date_added = db.DateTimeProperty(auto_now_add=True)
  date_solved = db.DateTimeProperty()
  solved = db.BooleanProperty()


def doCall(theCall):
        logging.debug('Performing a call')
        username = config.pool_user
        pw = config.pool_password

        encoded = base64.b64encode(username + ':' + pw)
        authstr = "Basic "+encoded
                
        result = urlfetch.fetch(url=config.pool_server,
                        payload=theCall,
                        method=urlfetch.POST,
                        headers={ 'Authorization':authstr}
                        )
        return result
        

class MainHandler(webapp.RequestHandler):
    def get(self):
        self.response.out.write('Jilaku!')


class SubmitWork(webapp.RequestHandler):
    def get(self):
        self.response.out.write('Jilaku!')
    
    def post(self):
        logging.info('Submit Work')
        golden_ticket = self.request.get("golden_ticket")
        logging.debug('Ticket: '.join(golden_ticket))
        
        submitworkCall = { "id":"1", "method":"getwork", "params":[golden_ticket]}
        
        
        result = doCall(submitworkCall)

        
        logging.debug('return from submitwork: '.join(result.content))
                
        self.response.out.write(result.content)
        
        
        # The Query interface constructs a query using instance methods.
        q = Work.all()
        q.filter("solved =", False)
        q.order("-date_added")
        
        if q.count() > 0:
                result = q.get()
                
                result.date_solved = datetime.datetime.now()
                result.solved = True
                result.golden_ticket = golden_ticket
                result.put()
                Getwork.get()
        else:
                self.response.out.write("Error saving work")
        


class GetWork(webapp.RequestHandler):
    def get(self):
        
        logging.info('Get Work')
        
        #fake_work = '{"result":{"midstate":"9f452bf09f82b78cc99b1277125c77844bbcfa382e294136a73a56a27188f585","data":"00000001e5b5979c98525e7bdde6bc8a4ba5d64ac0acbd7f501f474500000a0b00000000391393c3c94aacbb837347074f6e4fd62aa861536b1db5404f4a8441e214c29e4e051fdb1a0c2a1200000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000","hash1":"00000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000010000","target":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000"},"error":null,"id":"1"}'
        
        #self.response.out.write(fake_work)        
        
        # The Query interface constructs a query using instance methods.
        q = Work.all()
        q.filter("solved =", False)
        q.order("-date_added")
        
        if q.count() > 0:
                result = q.get()
                logging.debug('return from getwork query: '.join(result.jsondata))
                self.response.out.write(result.jsondata)
        else:
        
                getworkCall = '{ "id":"1", "method":"getwork", "params":[] }'        
                result = doCall(getworkCall)
                logging.debug('Result from getwork: '.join(result.content))
                json_data = result.content
                parsed_data = json.loads(result.content)
                parsed_data = parsed_data["result"]
                
                key_data = parsed_data["data"]
                
                newWork = Work(key_name = key_data)
                newWork.jsondata = result.content
                newWork.hashdata = parsed_data["data"]
                newWork.midstate = parsed_data["midstate"]
                newWork.hash1 = parsed_data["hash1"]
                newWork.target = parsed_data["target"]
                newWork.solved = False
                newWork.put()
                               
                self.response.out.write(json_data)



def main():
    application = webapp.WSGIApplication([('/', MainHandler),
                                          ('/getwork/', GetWork),
                                          ('/submitwork/', SubmitWork) ],
                                         debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
