import 'should'

import {strict as assert} from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

import sinon from 'sinon'

import {FileStore} from './'
import {Upload} from '@tus/server'

import * as shared from '../../test/stores.test'
import {MemoryConfigstore} from './configstores/MemoryConfigstore'

const fixturesPath = path.resolve('../', '../', 'test', 'fixtures')
const storePath = path.resolve('../', '../', 'test', 'output')

describe('FileStore', function () {
  before(function () {
    this.testFileSize = 960_244
    this.testFileName = 'test.mp4'
    this.storePath = storePath
    this.testFilePath = path.resolve(fixturesPath, this.testFileName)
    this.filesDirectory = storePath
  })

  beforeEach(function () {
    sinon.spy(fs, 'mkdir')
    this.datastore = new FileStore({
      directory: this.storePath,
      configstore: new MemoryConfigstore(),
    })
  })

  this.afterEach(() => {
    // @ts-expect-error ignore
    fs.mkdir.restore()
  })

  it('should create a directory for the files', function (done) {
    // @ts-expect-error should
    assert(fs.mkdir.calledOnce)
    // @ts-expect-error should
    assert.equal(this.datastore.directory, fs.mkdir.getCall(0).args[0])
    done()
  })

  describe('create', () => {
    const file = new Upload({id: '1234', size: 1000, offset: 0})

    it('should reject when the directory doesnt exist', function () {
      this.datastore.directory = 'some_new_path'
      return this.datastore.create(file).should.be.rejected()
    })

    it('should resolve when the directory exists', function () {
      return this.datastore.create(file).should.be.fulfilled()
    })

    it('should create an empty file', async function () {
      // TODO: this test would pass even if `datastore.create` would not create any file
      // as the file probably already exists from other tests
      await this.datastore.create(file)
      const stats = fs.statSync(path.join(this.datastore.directory, file.id))
      assert.equal(stats.size, 0)
    })
  })

  describe('write', function () {
    const file = new Upload({
      id: '1234',
      // @ts-expect-error todo
      size: this.testFileSize,
      offset: 0,
      metadata: {filename: 'world_domination_plan.pdf', is_confidential: null},
    })

    it("created file's size should match 'upload_length'", async function () {
      await this.datastore.create(file)
      await this.datastore.write(fs.createReadStream(this.testFilePath), file.id, 0)
      const stats = fs.statSync(this.testFilePath)
      assert.equal(stats.size, this.testFileSize)
    })
  })

  describe('getUpload', () => {
    it('should reject directories', function () {
      return this.datastore.getUpload('').should.be.rejected()
    })
  })

  shared.shouldHaveStoreMethods()
  shared.shouldCreateUploads()
  shared.shouldRemoveUploads() // Termination extension
  shared.shouldWriteUploads()
  shared.shouldHandleOffset()
  shared.shouldDeclareUploadLength() // Creation-defer-length extension
})
