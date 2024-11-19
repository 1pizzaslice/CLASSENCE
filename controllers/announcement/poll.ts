import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";

import {PollResponse} from '../../models';
import {Announcement} from '../../models';


const submitPollResponse = async (req: CustomRequest, res: Response , next:NextFunction) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  const { announcementId, selectedOption } = req.body;

  try {
    const pollResponse = new PollResponse({
      announcementId,
      userId,
      selectedOption
    });

    await pollResponse.save();

    await Announcement.updateOne(
      { _id: announcementId, 'poll.options.optionText': selectedOption },
      { $inc: { 'poll.options.$.votes': 1 } }
    );

    res.status(201).json({success:true, message: 'Poll response submitted successfully' });
  } catch (error) {
    next(new CustomError('Failed to submit poll response', 500));
  }
};


const getPollResults = async (req: CustomRequest, res: Response,next:NextFunction) => {
  const { announcementId } = req.params;

  try {
    const responses = await PollResponse.find({ announcementId }).populate('userId', 'name');
    res.json({success:true, responses });
  } catch (error) {
    next(new CustomError('Failed to get poll results', 500));
  }
};

export { submitPollResponse, getPollResults };

