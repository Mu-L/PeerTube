import { Response } from 'express'
import { fetchVideo, VideoFetchType } from '../video'
import { UserRight } from '../../../shared/models/users'
import { VideoChannelModel } from '../../models/video/video-channel'
import {
  MUser,
  MUserAccountId,
  MVideoAccountLight,
  MVideoFullLight,
  MVideoIdThumbnail,
  MVideoImmutable,
  MVideoThumbnail,
  MVideoWithRights
} from '@server/types/models'
import { VideoFileModel } from '@server/models/video/video-file'
import { HttpStatusCode } from '../../../shared/core-utils/miscs/http-error-codes'

async function doesVideoExist (id: number | string, res: Response, fetchType: VideoFetchType = 'all') {
  const userId = res.locals.oauth ? res.locals.oauth.token.User.id : undefined

  const video = await fetchVideo(id, fetchType, userId)

  if (video === null) {
    res.status(HttpStatusCode.NOT_FOUND_404)
       .json({ error: 'Video not found' })
       .end()

    return false
  }

  switch (fetchType) {
    case 'all':
      res.locals.videoAll = video as MVideoFullLight
      break

    case 'only-immutable-attributes':
      res.locals.onlyImmutableVideo = video as MVideoImmutable
      break

    case 'id':
      res.locals.videoId = video as MVideoIdThumbnail
      break

    case 'only-video':
      res.locals.onlyVideo = video as MVideoThumbnail
      break

    case 'only-video-with-rights':
      res.locals.onlyVideoWithRights = video as MVideoWithRights
      break
  }

  return true
}

async function doesVideoFileOfVideoExist (id: number, videoIdOrUUID: number | string, res: Response) {
  if (!await VideoFileModel.doesVideoExistForVideoFile(id, videoIdOrUUID)) {
    res.status(HttpStatusCode.NOT_FOUND_404)
       .json({ error: 'VideoFile matching Video not found' })
       .end()

    return false
  }

  return true
}

async function doesVideoChannelOfAccountExist (channelId: number, user: MUserAccountId, res: Response) {
  const videoChannel = await VideoChannelModel.loadAndPopulateAccount(channelId)

  if (videoChannel === null) {
    res.status(HttpStatusCode.BAD_REQUEST_400)
       .json({ error: 'Unknown video "video channel" for this instance.' })

    return false
  }

  // Don't check account id if the user can update any video
  if (user.hasRight(UserRight.UPDATE_ANY_VIDEO) === true) {
    res.locals.videoChannel = videoChannel
    return true
  }

  if (videoChannel.Account.id !== user.Account.id) {
    res.status(HttpStatusCode.BAD_REQUEST_400)
      .json({ error: 'Unknown video "video channel" for this account.' })

    return false
  }

  res.locals.videoChannel = videoChannel
  return true
}

function checkUserCanManageVideo (user: MUser, video: MVideoAccountLight, right: UserRight, res: Response, onlyOwned = true) {
  // Retrieve the user who did the request
  if (onlyOwned && video.isOwned() === false) {
    res.status(HttpStatusCode.FORBIDDEN_403)
       .json({ error: 'Cannot manage a video of another server.' })
       .end()
    return false
  }

  // Check if the user can delete the video
  // The user can delete it if he has the right
  // Or if s/he is the video's account
  const account = video.VideoChannel.Account
  if (user.hasRight(right) === false && account.userId !== user.id) {
    res.status(HttpStatusCode.FORBIDDEN_403)
       .json({ error: 'Cannot manage a video of another user.' })
       .end()
    return false
  }

  return true
}

// ---------------------------------------------------------------------------

export {
  doesVideoChannelOfAccountExist,
  doesVideoExist,
  doesVideoFileOfVideoExist,
  checkUserCanManageVideo
}
