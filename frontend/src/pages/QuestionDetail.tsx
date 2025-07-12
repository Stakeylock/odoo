
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { questionsService, Question } from '@/services/questionsService';
import { answersService, Answer } from '@/services/answersService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import { 
  ThumbsUp, 
  ThumbsDown, 
  User, 
  Calendar, 
  Check,
  MessageSquare 
} from 'lucide-react';

export const QuestionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuestion();
      fetchAnswers();
    }
  }, [id]);

  const fetchQuestion = async () => {
    if (!id) return;
    
    try {
      const data = await questionsService.getQuestion(id);
      setQuestion(data);
    } catch (error) {
      console.error('Error fetching question:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    if (!id) return;
    
    try {
      const data = await answersService.getAnswers(id);
      setAnswers(data);
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id || !newAnswer.trim()) return;

    setSubmitting(true);

    try {
      await answersService.createAnswer(id, { content: newAnswer.trim() });
      setNewAnswer('');
      fetchAnswers();
      
      toast({
        title: "Success!",
        description: "Your answer has been posted."
      });
    } catch (error: any) {
      console.error('Error posting answer:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to post answer",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (answerId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on answers.",
        variant: "destructive"
      });
      return;
    }

    try {
      await answersService.voteAnswer(answerId, voteType);
      fetchAnswers();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive"
      });
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!user || !question || question.user_id !== user.id) return;

    try {
      await answersService.acceptAnswer(answerId);
      fetchAnswers();
      
      toast({
        title: "Success!",
        description: "Answer has been marked as accepted."
      });
    } catch (error: any) {
      console.error('Error accepting answer:', error);
      toast({
        title: "Error",
        description: "Failed to accept answer",
        variant: "destructive"
      });
    }
  };

  const getVoteScore = (votes: Answer['votes']) => {
    return votes.reduce((score, vote) => {
      return vote.vote_type === 'upvote' ? score + 1 : score - 1;
    }, 0);
  };

  const getUserVote = (votes: Answer['votes']) => {
    if (!user) return null;
    return votes.find(vote => vote.user_id === user.id)?.vote_type || null;
  };

  if (loading) {
    return <div className="text-center py-8">Loading question...</div>;
  }

  if (!question) {
    return <div className="text-center py-8">Question not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Question */}
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">{question.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{question.users?.username}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(question.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div 
            className="prose max-w-none mb-4"
            dangerouslySetInnerHTML={{ __html: question.description }}
          />
          
          <div className="flex flex-wrap gap-2">
            {question.question_tags?.map(({ tags }) => (
              <Link 
                key={tags.id}
                to={`/?tag=${tags.id}`}
              >
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  {tags.name}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
          </h2>
        </div>

        {answers.map((answer) => {
          const voteScore = getVoteScore(answer.votes);
          const userVote = getUserVote(answer.votes);
          
          return (
            <Card key={answer.id} className={answer.is_accepted ? 'border-green-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(answer.id, 'upvote')}
                      className={userVote === 'upvote' ? 'text-green-600' : ''}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    
                    <span className="font-semibold text-lg">{voteScore}</span>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(answer.id, 'downvote')}
                      className={userVote === 'downvote' ? 'text-red-600' : ''}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>

                    {question.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcceptAnswer(answer.id)}
                        className={answer.is_accepted ? 'text-green-600' : ''}
                        title="Accept this answer"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Answer content */}
                  <div className="flex-1">
                    {answer.is_accepted && (
                      <div className="flex items-center gap-2 mb-2 text-green-600">
                        <Check className="h-4 w-4" />
                        <span className="font-semibold">Accepted Answer</span>
                      </div>
                    )}
                    
                    <div 
                      className="prose max-w-none mb-4"
                      dangerouslySetInnerHTML={{ __html: answer.answer }}
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={answer.users?.avatar_url} />
                          <AvatarFallback>
                            {answer.users?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{answer.users?.username}</span>
                        <span>•</span>
                        <span>{new Date(answer.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Answer form */}
      {user ? (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Your Answer</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <RichTextEditor
                content={newAnswer}
                onChange={setNewAnswer}
                placeholder="Write your answer here..."
              />
              
              <Button type="submit" disabled={submitting || !newAnswer.trim()}>
                {submitting ? 'Posting...' : 'Post Answer'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Please sign in to post an answer.
            </p>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
