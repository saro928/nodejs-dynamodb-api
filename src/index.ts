import 'dotenv/config' // Load environment variables
import express, { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'

// Initialize Express app
const app = express()
app.use(express.json()) // For parsing application/json
app.use(express.urlencoded({ extended: true })) // For parsing application/x-www-form-urlencoded

// DynamoDB Table Name
const POST_TABLE = 'post'

// Configure DynamoDB Client
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION })
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient)

interface Post {
  id: string
  user_id: string
  content: string
}

// Get all posts
app.get('/posts', async (_req: Request, res: Response) => {
  try {
    const data = await ddbDocClient.send(
      new ScanCommand({ TableName: POST_TABLE })
    )
    res.json(data.Items || [])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not fetch posts' })
  }
})

// Create a post
app.post('/posts', async (req: Request, res: Response) => {
  const { user_id, content } = req.body

  if (!content || !user_id) {
    return res.status(400).json({ error: 'content and user_id are required' })
  }

  const post: Post = {
    id: uuidv4(),
    user_id,
    content,
  }

  try {
    await ddbDocClient.send(
      new PutCommand({ TableName: POST_TABLE, Item: post })
    )
    res.status(201).json(post)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not create post' })
  }
})

// Update a post
app.put('/posts/:post_id', async (req: Request, res: Response) => {
  const { post_id } = req.params
  const { content } = req.body

  if (!content) {
    return res.status(400).json({ error: 'Content is required' })
  }

  try {
    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: POST_TABLE,
        Key: { id: post_id },
        UpdateExpression: 'set content = :content',
        ExpressionAttributeValues: {
          ':content': content,
        },
        ReturnValues: 'ALL_NEW',
      })
    )
    res.json(result.Attributes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not update post' })
  }
})

// Delete a post
app.delete('/posts/:post_id', async (req: Request, res: Response) => {
  const { post_id } = req.params

  try {
    await ddbDocClient.send(
      new DeleteCommand({ TableName: POST_TABLE, Key: { id: post_id } })
    )
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not delete post' })
  }
})

// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
